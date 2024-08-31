import { Injectable } from '@angular/core';
import { User, ClientDataObj, DecodedAttestionObj, DecodedPublicKeyCredential } from '../models/web-authn.model';
import * as CBOR from '../utils/cbor';
import * as base64js from '../utils/base64';
import * as uuid from 'uuid';
import { base64ToArrayBuffer, genUUID } from '../components/web-authn/utils/app-util';
@Injectable({
    providedIn: 'root'
})
export class MockService {
    userList: User[] = localStorage.getItem("user_list") ? JSON.parse(localStorage.getItem("user_list")) : [];

    constructor() { }

    getUserByDeviceId(deviceId: string) {
        return this.userList.find(user => user.deviceId === deviceId);
    }

    getAllUser() {
        return this.userList;
    }

    validateCreateUser(user: User) {
        const errorMsgList: string[] = [];
        if (this.getUserByEmail(user.email)) {
            errorMsgList.push("Email is already registered");
        }
        if (this.getUserByMobileNumber(user.mobileNumber)) {
            errorMsgList.push("Mobile Number is already registered");
        }
        return errorMsgList;
    }

    saveChanges() {
        localStorage.setItem("user_list", JSON.stringify(this.userList));
    }

    createUser(user: User) {
        this.userList.push(user);
        this.saveChanges();
        return this.getUserByMobileNumber(user.mobileNumber);
    }

    deleteUser(user: User) {
        this.userList.splice(this.getUserIndex(user), 1);
        this.saveChanges();
    }

    resetUser() {
        this.userList = [];
        this.saveChanges();
    }

    getUserIndex(user: User) {
        return this.userList.findIndex(item => item.mobileNumber === user.mobileNumber);
    }

    getUserByMobileNumber(mobileNumber: string) {
        return this.userList.find(user => user.mobileNumber === mobileNumber);
    }

    getUserByEmail(email: string) {
        return this.userList.find(user => user.email === email);
    }


    updateUser(user: User) {
        const userIndex = this.getUserIndex(user);
        this.userList[userIndex] = user;
        this.saveChanges();
        return this.userList[userIndex];
    }

    private getPlatformFlag(): boolean {
        return !!JSON.parse(localStorage.getItem('isPlatform'));
    }

    signup(user: User): Promise<Credential> {
        const authenticatorAttachment = this.getPlatformFlag() ? 'platform' : 'cross-platform';
        const challenge: string = genUUID();
        console.log("----------Sign up challenge----------");
        console.log(challenge);
        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
            // Should generate from server
            challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
            // Relying Party
            rp: {
                name: "demo",
                // id: "" // domain
            },
            user: {
                // Some user id coming from the server
                id: Uint8Array.from(user.mobileNumber, c => c.charCodeAt(0)),
                name: user.email,
                displayName: user.email,
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            authenticatorSelection: {
                authenticatorAttachment,
                // authenticatorAttachment: 'platform',
                userVerification: 'required'
            },
            timeout: 100000,
            attestation: 'direct'
        };
        console.log("----------Sign up Payload----------");
        console.log(JSON.stringify(publicKeyCredentialCreationOptions));
        return navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        });
    }

    signin(user: User): Promise<Credential> {
        const transports: AuthenticatorTransport[] = this.getPlatformFlag() ? ['internal'] : ['usb'];
        const allowCredentials: PublicKeyCredentialDescriptor[] = user.credentials.map(c => {
            return {
                transports,
                // transports: ['internal'],
                type: 'public-key', id: new Uint8Array(base64ToArrayBuffer(c.credentialIdString))
                // id: Uint8Array.from(c.credentialId)
            };
        });

        console.log("----------Sign in challenge----------");
        const challenge: string = genUUID();
        console.log(challenge);
        const credentialRequestOptions: PublicKeyCredentialRequestOptions = {
            challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
            allowCredentials,
            userVerification: 'required'

        };
        console.log("----------Sign in Payload----------")
        console.log(JSON.stringify(credentialRequestOptions));

        return navigator.credentials.get({
            publicKey: credentialRequestOptions,
        });
    }
}
