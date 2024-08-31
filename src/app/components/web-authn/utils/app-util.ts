import { ClientDataObj, DecodedAttestionObj, User } from "src/app/models/web-authn.model";
import * as CBOR from '../../../utils/cbor';
import * as uuid from 'uuid';
import { Observable, from, of } from "rxjs";

export const genUUID = () => {
    return uuid.v4();
}

// Should generate from server
export const getChallenge = () => {
    const challenge = new Uint8Array(32);
    return window.crypto.getRandomValues(challenge);
}

export const isSupportBiometricLogin = (): Observable<boolean> => {
    if (window.PublicKeyCredential) {
        return from(new Promise<boolean>((resolve, reject) => {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(available => {
                    if (available) {
                        // console.log("Supported.");
                        resolve(true);
                    } else {
                        // console.log("WebAuthn supported, Platform Authenticator *not* supported.");
                        resolve(false);
                    }
                })
                .catch(error => {
                    // console.log("Something went wrong.");
                    resolve(false);
                })
        }));
    } else {
        // console.log("Not supported.");
        return of(false);
    }
}

export const publicKeyCredentialToBase64Url = (publicKeyCred) => {
    if (publicKeyCred instanceof ArrayBuffer) {
        return base64urlEncode(publicKeyCred);
    } else if (publicKeyCred instanceof Array) {
        return publicKeyCred.map(publicKeyCredentialToBase64Url);
    } else if (publicKeyCred instanceof Object) {
        const obj = {};
        for (let key in publicKeyCred) {
            obj[key] = publicKeyCredentialToBase64Url(publicKeyCred[key]);
        }
        return obj;
    } else return publicKeyCred;
}

export const base64urlEncode = (arraybuffer): string => {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    // Use a lookup table to find the index.
    let lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    let bytes = new Uint8Array(arraybuffer),
        i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
        base64 = base64.substring(0, base64.length - 1);
    } else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2);
    }

    return base64;
}

export const base64urlDecode = (base64): ArrayBuffer => {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    // Use a lookup table to find the index.
    var lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    let bufferLength = base64.length * 0.75,
        len = base64.length, i, p = 0,
        encoded1, encoded2, encoded3, encoded4;

    let arraybuffer = new ArrayBuffer(bufferLength),
        bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i += 4) {
        encoded1 = lookup[base64.charCodeAt(i)];
        encoded2 = lookup[base64.charCodeAt(i + 1)];
        encoded3 = lookup[base64.charCodeAt(i + 2)];
        encoded4 = lookup[base64.charCodeAt(i + 3)];

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
};

export const decodePublicKeyCredential = (credential: PublicKeyCredential) => {
    const obj = {};
    for (let key in credential) {
        switch (key) {
            case "id":
            case "type":
                obj[key] = credential[key];
                break;
            case "rawId":
                obj[key] = arrayBufferToBase64(credential[key])
                break;
            case "response":
                const utf8Decoder = new TextDecoder('utf-8');
                const decodedClientData = utf8Decoder.decode(credential.response.clientDataJSON);
                const clientDataObj: ClientDataObj = JSON.parse(decodedClientData);
                const decodedAttestationObj: DecodedAttestionObj = CBOR.decode((credential.response as any).attestationObject);
                obj[key] = {};
                obj[key]["clientDataJSON"] = clientDataObj;
                obj[key]["attestationObject"] = decodedAttestationObj;
                break;
            default:
                break;
        }
    }
    return obj;
}

export const arrayBufferToBase64 = (buffer) => {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
export const base64ToArrayBuffer = (base64) => {
    let binary_string = window.atob(base64);
    let len = binary_string.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// Validate and Store credential
export const registerCredential = (user: User, credential: PublicKeyCredential) => {
    const authData = extractAuthData(credential);
    const credentialIdLength = getCredentialIdLength(authData);
    const credentialId: Uint8Array = authData.slice(55, 55 + credentialIdLength);
    const publicKeyBytes: Uint8Array = authData.slice(55 + credentialIdLength);
    // const publicKeyObject = CBOR.decode(publicKeyBytes.buffer);
    const valid = true;
    if (valid) {
        // Save publicKeyBytes and credentialId
        user.credentials.push({ credentialIdString: arrayBufferToBase64(credentialId), publicKeyString: arrayBufferToBase64(publicKeyBytes) });
    }
    return { valid, user: user };
}

export const extractAuthData = (credential: PublicKeyCredential): Uint8Array => {
    const decodedAttestationObj: DecodedAttestionObj = CBOR.decode((credential.response as any).attestationObject);
    const { authData } = decodedAttestationObj;
    return authData;
}

export const getCredentialIdLength = (authData: Uint8Array): number => {
    // get the length of the credential ID
    const dataView = new DataView(new ArrayBuffer(2));
    const idLenBytes = authData.slice(53, 55);
    idLenBytes.forEach((value, index) => dataView.setUint8(index, value));
    return dataView.getUint16(0);
}

export const arrayBufferToStr = (buf) => {
    let decoder = new TextDecoder("utf-8");
    return decoder.decode(buf);
}

export const decodeAssertion = (assertion) => {
    let clientDataStr = arrayBufferToStr(assertion.response.clientDataJSON);
    let clientDataObj: ClientDataObj = JSON.parse(clientDataStr);
    console.log("----------Sign in clientDataObj----------")
    console.log(JSON.stringify(clientDataObj));
    const userHandle = assertion.response.userHandle && arrayBufferToStr(assertion.response.userHandle);
    console.log("----------User Handle----------")
    console.log(userHandle);
}