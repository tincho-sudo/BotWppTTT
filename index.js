const express = require('express');
const puppeteer = require('puppeteer');
const { connect } = require('amqplib');
const firebase = require('firebase-admin');

const serviceAccount = {
  type: 'service_account',
  project_id: 'botwppttt',
  private_key_id: '569c392b1f7712fd3198f95c7b714729324c1962',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCve9M1IoUl6oLi\nBjfYAh9/yzQq8iF6W69Xa56zi8+k8+USz20cUM2rqbd1R+MC14VaJ3LDEikLQumj\n1xtkHQCp4ig3yg5f4gwZD/oVkjwVrTjmPdOBp42fCk2KLZ/GUy0Yn1iRDr2WY9tK\ncaNgtvLxYzXEuQrKhKX62nxXZYmHUpsmRUVfFJKcSq+yj1hamA73aCd5JytU5c/o\nT3AUHk1HNSnzUHkFAIO5P1+wqG1a+oSMmgKJ+6SLazKXfWyMrfcDo/0NNAWcSdjH\nB3r9Fw8Q262sz9fvR9qgd4Wnbb091Zopuq6fosmHx8x2Wqg+G77HXqth+cyl6het\nqoM9ngP5AgMBAAECggEAP5LV+O15HDvhz72d9JEMVVFKJHbUvw3BL6QK+hPgFWvQ\nZOilqDjz0clp78Cr0sc+heM9tcL6AJzspNEUmMfTCjinBlMaswzjAh9iI/d28glv\n0CW83r9TVLc4USNnO0O91ipAPUkAUR/6/XS+0hZlXCLrg0ngSW8V7JPDsSvVT6L4\nwobdJCtKXt9CmsQWs9em0mChQAVcFVvn/FcJcSbOuE+t7GyuLfuAAf1De4ULDAT+\ns0lLI+gjff9/NMIB+cXEYNwTPTcZsOmyr/XvXGRTKbgteXQ3hfCq6XQuZNX3DGZI\nFfMNRmf3H3vcXs87Fe2/CB+dGwbsUVf/iCZkB4nDCwKBgQDqFNrVnFz1lM2W2VCF\n3GnBCd9f39/7/QTMQaoMfqlZYSEQl6NBdb/3wjPWO6c7hpl1BEVACGYZ4f42Eyks\n4AVKwi0y3KKneIq2MgFjjI7jRmhq8yBlnqY5UpFJy+1+yCU2fspbl9sdA9ZJKq1X\nU46uEQTKq5/VKfZzmamkCybmgwKBgQC/6lQSeKou/PrXUvA2vhhHmSsVxkmuD33j\nbNz5cLf7jCvDh4sjZnSF7rJUVxKUmcVuZIR/27occBBQtUoZmrWDVdfZ+jMWfaKI\nqC1lKR+wgULntGZhU1+YXUpHjlwxxpdBfZYyl5ZGM8QZY7cWBXMNpAfBxVVMtd2f\n7OLIImsC0wKBgAJ8ZjaOio4xHl3TwP8q8BSUvkKOZhqO/VYN/HhVgAbq+Sbr9Vfk\noD1JWrOTvprrOwX7HaEoda0gsUpxuaY4WtYIaeJ4ZWHR7ecxcMJV486WGNXJ7zYl\nES7aqaBXAhaumXaSsiN24WTVfZkZUu3yfTlsBNkCKZhh8bQYlaygUbFxAoGAU0/E\nQ2iCaHeF5SeqA/mtzJcfbwpvPdKX0byWiOp31AlbjjwvGKUHfITMgXRzKnM+k9eq\n9V5LgsDbNE4e5tKUbXk8hPHqb58GidCINFwP162lf7R+pU1uOFR3RGz2dN1DGDkO\nlNPddohOXr884aBn+8nzXBjwGKbymNRa9oqKbeUCgYA07mqb962IMJBUs+tmSHUe\nLBEYKsDu3241W02Q2c6M/LZDyBuJRGw6KjD2ZlG65wMY8uSnc64p0QVisr1UnKHD\nPGvRTqEHejSaJKtlAltVwbs2idoPp2+ZXSxjPPabV4+SebV8y6hbkdHlhgv52wtK\nxm/OVuNMq1M+2tUM2vy/Zg==\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-halnj@botwppttt.iam.gserviceaccount.com',
  client_id: '117677817948247757417',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-halnj%40botwppttt.iam.gserviceaccount.com',
};

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const app = express();
const queue = 'whatsapp-messages';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle2' });
    console.log('WhatsApp Web connected successfully!');

    const connection = await connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(queue);

    await page.exposeFunction('processMessage', async ({ number, message }) => {
      try {
        if (typeof number !== 'string' || typeof message !== 'string') {
          throw new Error('Invalid message data');
        }

        console.log(`Received message from ${number}: ${message}`);

        const ref = firebase.database().ref('messages');
        await ref.push().set({
          number,
          message,
          timestamp: Date.now(),
        });

        console.log(`Message saved to database`);

        await channel.sendToQueue(queue, Buffer.from(JSON.stringify({ number, message })));
      } catch (err) {
        console.error(`Error processing message: ${err}`);
      }
    });

    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.classList && node.classList.contains('_3_7SH')) {
              const number = node.querySelector('._3Whw5').innerText;
              const message = node.querySelector('span.selectable-text').innerText;
              // eslint-disable-next-line no-undef
              window.processMessage({ number, message });
            }
          });
        });
      });
      // eslint-disable-next-line no-undef
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });

    console.log('Listening for incoming messages...');
  } catch (err) {
    console.error(`Error starting application: ${err}`);
  }
})();

app.listen(process.env.PORT || 5000, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
