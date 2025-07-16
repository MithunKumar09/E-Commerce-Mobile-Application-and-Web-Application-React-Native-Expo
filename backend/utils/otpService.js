const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Twilio configuration
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONENUMBER;
const twilioClient = twilio(accountSid, authToken);

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // If using Gmail; replace with your provider
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

// Functions to send OTP
const sendOtpToEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.USER_EMAIL,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
};

const sendOtpToPhone = async (phone, otp) => {
    await twilioClient.messages.create({
        body: `Your OTP code is: ${otp}`,
        from: twilioPhoneNumber,
        to: phone,
    }).then((message)=>console.log(message.sid));
};


module.exports = { sendOtpToEmail, sendOtpToPhone };