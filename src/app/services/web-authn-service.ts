import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { from, of } from 'rxjs';
import { DecodedAttestionObj, User } from 'src/app/models/web-authn.model';
import { MockService } from 'src/app/services/mock.service';
import * as CBOR from 'src/app/utils/cbor';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { base64urlDecode, publicKeyCredentialToBase64Url } from '../components/web-authn/utils/app-util';
@Injectable()
export class WebAuthnService {
    private url = '';
    private baseUrl = 'http://localhost:8080';
    constructor(public http: HttpClient) {
    }

    private getPlatformFlag(): boolean {
        return !!JSON.parse(localStorage.getItem('isPlatform'));
    }

    private getChallengeFromServer(): Observable<any> {
        this.url = `${this.baseUrl}/get-challenge`;
        return this.http.get<any>(this.url);
    }

    private getSigninChallengeFromServer(): Observable<any> {
        this.url = `${this.baseUrl}/get-signin-challenge`;
        return this.http.get<any>(this.url);
    }

    private signup(credential): Observable<any> {
        this.url = `${this.baseUrl}/web-authn-registration`;
        return this.http.post<any>(this.url, credential);
    }

    private webAuthnSignup(user: User, challenge: string): Promise<Credential> {
        const authenticatorAttachment = this.getPlatformFlag() ? 'platform' : 'cross-platform';
        console.log(challenge);
        let ch = base64urlDecode(challenge)
        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
            // Should generate from server
            challenge: ch,
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
                userVerification: "required"
            },
            timeout: 100000,
            attestation: 'direct'
        };
        return navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        });
    }

    private signin(credential): Observable<any> {
        this.url = `${this.baseUrl}/web-authn-authentication`;
        return this.http.post<any>(this.url, credential);
    }

    private webAuthnSignin(user: User, challengeResp: any): Promise<Credential> {
        const transports: AuthenticatorTransport[] = this.getPlatformFlag() ? ['internal'] : ['usb'];
        let ch = base64urlDecode(challengeResp.challenge);

        const allowCredentials: PublicKeyCredentialDescriptor[] = user.credentials.map(c => {
            console.log(base64urlDecode(c.credentialIdString));
            const credentialId = base64urlDecode(c.credentialIdString);
            return {
                transports, type: 'public-key', id: credentialId
                // id: Uint8Array.from(c.credentialId),
            };
        });

        const credentialRequestOptions: PublicKeyCredentialRequestOptions = {
            challenge: ch,
            // challenge: new Uint8Array(a),
            allowCredentials,
            userVerification: "required"
        };
        console.log("----------Sign in Payload----------")
        console.log(JSON.stringify(credentialRequestOptions));

        return navigator.credentials.get({
            publicKey: credentialRequestOptions,
        });
    }


    private isSupportBiometricLogin(): Observable<boolean> {
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
    };

    signupFlow(user): Observable<any> {
        return this.getChallengeFromServer().pipe(
            switchMap(challengeResp => {
                const { challenge } = challengeResp;
                return from(
                    this.webAuthnSignup(user, challenge)
                        .then((credential: any) => {
                            const credentialBase64Url = publicKeyCredentialToBase64Url(credential);
                            console.log(credentialBase64Url);
                            return Promise.resolve(credentialBase64Url)
                        })
                        .catch(error => Promise.reject(error))
                )
            }),
            switchMap(credentialBase64Url => {
                return this.signup(credentialBase64Url);
            }),
            catchError(error => {
                // handle error
                return of(error);
            }),
            finalize(() => console.log("Finished"))
        );
    };

    signinFlow(user: User): Observable<any> {
        return this.getSigninChallengeFromServer().pipe(
            switchMap(challengeResp => {
                return from(this.webAuthnSignin(user, challengeResp)
                    .then(assertion => {
                        console.log(assertion);
                        const credentialBase64Url = publicKeyCredentialToBase64Url(assertion);
                        credentialBase64Url.response.userHandle = credentialBase64Url.response.userHandle || '';
                        credentialBase64Url.authenticator = {
                            credentialIdString: user.credentials[0].credentialIdString,
                            authenticatorString: user.authenticatorString
                        };
                        return Promise.resolve(credentialBase64Url);
                    })
                    .catch(error => Promise.reject(error))
                )
            }),
            switchMap(credentialBase64Url => {
                return this.signin(credentialBase64Url);
            }),
            catchError(error => {
                // handle error 
                return of(error)
            })
        );
    };
}