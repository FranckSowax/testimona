import { v4 as uuidv4 } from 'uuid';
import { LogTypeError, MailLogs } from "@prisma/client";
import { createTransport, SendMailOptions, SentMessageInfo } from "nodemailer";
import { GoogleApiConfigurationModel, SendMailModel } from "../models/services/mail.model";
import { ErrorServiceModel, MemorialModel, UserServiceModel } from "../models/_.models";
import { CommonService } from "./commons/common.service";
import { LogService } from "./commons/log.service";
import { Auth } from 'googleapis';
import _ from 'lodash';
import { ContactEmail } from '../helpers/constantes/_.constantes';

const serviceName = 'MailService';

export class MailService extends CommonService {  
    private static instance: MailService;
    static getInstance() {
        if (!MailService.instance) {
            MailService.instance = new MailService();
        }
        return MailService.instance;
    }
  
    constructor() {
        super();
    }

    async sendEmailActivateAccount(userEmail: string, userId: string, userFirstname: string, userLastname: string, userLanguage: string): Promise<SendMailModel> {
        try {
            const recipientEmail = this.getRecipientAddress([userEmail]);
            const mailDetails = this.getEmailBodyActivateAccount(recipientEmail.join(','), userId, userFirstname, userLastname, userLanguage);
            const sendMailResult = await this.sendMail(mailDetails);

            await this.saveResultInDb(sendMailResult, 0, mailDetails);

            return sendMailResult;
        } catch (error: any) {
            console.log(error);
            LogService.getInstance().create(
                LogTypeError.Error,
                new ErrorServiceModel(serviceName, 'sendRequestEmail', { userEmail, userLanguage }),
                error.message,
              );
            throw error;
        }
    }

    private getEmailBodyActivateAccount(recipientEmail: string, userId: string, userFirstname: string, userLastname: string, userLanguage: string): SendMailOptions {
        var path = require('path');

        let from: string = '';
        let subject: string = '';
        let body: string = '';
        body += `<body>`;

        switch (userLanguage) {
            case 'en':
                from = `Testimona - Customer service <${ContactEmail}>`;
                subject = 'Account Activation - Please confirm your email';
                body += `<p><b>Dear ${userFirstname} ${userLastname}</b></p>`;
                body += `<p>Thank you for choosing Testimona to celebrate the life of those who passed away. Our goal is to provide you with a safe place to share beautiful memories of your loved ones in heaven.</p>`;
                body += `<p>Please click <a href="${process.env.WEBSITE_URL!}/activate/${userId}" target="_blank">here</a> to confirm your email.</p>`;
                body += `<p>If you have any questions, write us at ${ContactEmail}.</p>`;
                body += `<br />`;
                body += `<p>Sincerely,</p>`;
                body += `<p>Testimona team</p>`;
                break;
            case 'fr':
                from = `Testimona - Service client <${ContactEmail}>`;
                subject = 'Activation du compte - Confirmez votre courriel';
                body += `<p><b>Bienvenue ${userFirstname}</b></p>`;
                body += `<p>Merci d’avoir choisi Testimona pour célébrer la vie de ceux qui nous ont quittés. Notre objectif est de vous permettre de partager en toute sécurité les plus beaux souvenirs de vos êtres chers qui reposent en paix.</p>`;
                body += `<p>Cliquez <a href="${process.env.WEBSITE_URL!}/activate/${userId}" target="_blank">ici</a> pour confirmer votre courriel.</p>`;
                body += `<p>Si vous avez des questions, écrivez-nous à ${ContactEmail}.</p>`;
                body += `<br />`;
                body += `<p>Sincèrement,</p>`;
                body += `<p>L’équipe Testimona</p>`;
                break;
        }

        body += `</body>`;

        return {
            from: from,
            to: recipientEmail,
            subject: subject,
            html : body
        };
    }

    async sendEmailAdminRequestMemorial(emailUsersData: Array<string>, memorialData: MemorialModel, requestId: string, relative: string, note: string): Promise<SendMailModel> {
        try {
            const recipientEmail = this.getRecipientAddress(emailUsersData);
            const mailDetails = this.getEmailBodyAdminRequestMemorial(recipientEmail.join(','), note);
            const sendMailResult = await this.sendMail(mailDetails);

            await this.saveResultInDb(sendMailResult, memorialData.id, mailDetails);

            return sendMailResult;
        } catch (error: any) {
            console.log(error);
            LogService.getInstance().create(
                LogTypeError.Error,
                new ErrorServiceModel(serviceName, 'sendRequestEmail', { emailUsersData, memorialUrl: memorialData.url, requestId, relative, note }),
                error.message,
              );
            throw error;
        }
    }

    private getEmailBodyAdminRequestMemorial(recipientEmail: string, note: string): SendMailOptions {
        let body: string = '';
        body += `<body>`;
        body += `<p><b>Hello,</b></p>`;
        body += `<p>[need body for the email]<br /><br />`;
        body += `<p>${note}<br /><br />`;
        body += `For any questions, write to us at ${ContactEmail}.<br /></p>`;
        body += `</body>`;

        return {
            from: `Testimona - Customer service <${ContactEmail}>`,
            to: recipientEmail,
            subject: `Request to be admin`,
            html : body
        };
    }

    async sendAllowedRequestEmailToApplicant(applicantData: UserServiceModel, memorialData: MemorialModel): Promise<SendMailModel> {
        try {
            const recipientEmail = this.getRecipientAddress([applicantData.email]);
            const mailDetails = this.getEmailBodyAllowedRequestToApplicant(recipientEmail.join(','));
            const sendMailResult = await this.sendMail(mailDetails);

            await this.saveResultInDb(sendMailResult, memorialData.id, mailDetails);

            return sendMailResult;
        } catch (error: any) {
            console.log(error);
            LogService.getInstance().create(
                LogTypeError.Error,
                new ErrorServiceModel(serviceName, 'sendRequestEmail', { applicantData, memorialData }),
                error.message,
              );
            throw error;
        }
    }

    private getEmailBodyAllowedRequestToApplicant(recipientEmail: string): SendMailOptions {
        let body: string = '';
        body += `<body>`;
        body += `<p><b>Hello,</b></p>`;
        body += `<p>[need body for the email]<br /><br />`;
        body += `For any questions, write to us at ${ContactEmail}.<br /></p>`;
        body += `</body>`;

        return {
            from: `Testimona - Customer service <${ContactEmail}>`,
            to: recipientEmail,
            subject: `Request to be admin - Allowed`,
            html : body
        };
    }

    async sendRejectedRequestEmailToApplicant(applicantData: UserServiceModel, memorialData: MemorialModel): Promise<SendMailModel> {
        try {
            const recipientEmail = this.getRecipientAddress([applicantData.email]);
            const mailDetails = this.getEmailBodyRejectedRequestEmailToApplicant(recipientEmail.join(','));
            const sendMailResult = await this.sendMail(mailDetails);

            await this.saveResultInDb(sendMailResult, memorialData.id, mailDetails);

            return sendMailResult;
        } catch (error: any) {
            console.log(error);
            LogService.getInstance().create(
                LogTypeError.Error,
                new ErrorServiceModel(serviceName, 'sendRequestEmail', { applicantData, memorialData }),
                error.message,
              );
            throw error;
        }
    }

    private getEmailBodyRejectedRequestEmailToApplicant(recipientEmail: string): SendMailOptions {
        let body: string = '';
        body += `<body>`;
        body += `<p><b>Hello,</b></p>`;
        body += `<p>[need body for the email]<br /><br />`;
        body += `For any questions, write to us at ${ContactEmail}.<br /></p>`;
        body += `</body>`;

        return {
            from: `Testimona - Customer service <${ContactEmail}>`,
            to: recipientEmail,
            subject: `Request to be admin - rejected`,
            html : body
        };
    }

    private getRecipientAddress(emailUsersData: string[]): Array<string> {
        const recipientEmails = new Array<string>();
        _.each(emailUsersData, (userEmail) => {
            if (userEmail.toLowerCase().includes('.test') == true) {
                recipientEmails.push(userEmail.toLowerCase().replace(/[.]+[test]+[0-9]*/gm, ''));
            } else {
                recipientEmails.push(userEmail);
            }
        });

        return recipientEmails;
    }

    private async sendMail(mailOptions: SendMailOptions): Promise<SendMailModel> {
        try {
            const googleApiConfig = await this.getGoogleApiConfiguration();

            const transporter = createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.GOOGLE_EMAIL,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
                    accessToken: googleApiConfig.accessToken as any
                }
            });

            const sendEmailResult = await new Promise<SendMailModel>((resolve, reject) => {
                    transporter.sendMail({
                        from: `Support Testimona <${ContactEmail}>`,
                        to: `Support Testimona <${ContactEmail}>`,
                        bcc: mailOptions.to,
                        subject: mailOptions.subject,
                        html: mailOptions.html
                    }, (err: Error | null, info: SentMessageInfo) => {
                        console.log(err);
                        return resolve({
                            success: err == null,
                            error: err,
                            mailId: info?.messageId ?? '',
                            mailResponse: info?.response ?? ''
                    });
                })
            });

            return Promise.resolve(sendEmailResult);
        } catch (error: any) {
            console.log(error);
            LogService.getInstance().create(
                LogTypeError.Error,
                new ErrorServiceModel(serviceName, 'sendMail', { mailOptions }),
                error.message,
              );
            throw error;
        }
    }

    private async getGoogleApiConfiguration(): Promise<GoogleApiConfigurationModel> {    
        const oAuth2Client = new Auth.OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

        const accessToken = await oAuth2Client.getAccessToken();
        return Promise.resolve({ accessToken });
    }

    private async saveResultInDb(sendMailResult: SendMailModel, memorialId: number, mailDetails: SendMailOptions): Promise<boolean> {
        try {
            const MailLogData = await this.executeQueries<MailLogs>([this._prismaDb.mailLogs.create({
                data: {
                    mailLogId: uuidv4(),
                    memorialId: memorialId > 0 ? `${memorialId}`: '',
                    mailDetails: mailDetails as any,
                    mailId: sendMailResult.mailId,
                    mailResponse: sendMailResult.mailResponse,
                    success: sendMailResult.success,
                    error: sendMailResult.error ? JSON.stringify(sendMailResult.error) : {}
                },
              })]);
            if (MailLogData == null || MailLogData == undefined) {
                return Promise.resolve(false);
            }

            return Promise.resolve(true);
        } catch (error: any) {
            console.log(error);
            LogService.getInstance().create(LogTypeError.Error, new ErrorServiceModel(serviceName, 'saveResultInDb', { sendMailResult, mailDetails }), error.message);
            throw error;
        }
    }
}