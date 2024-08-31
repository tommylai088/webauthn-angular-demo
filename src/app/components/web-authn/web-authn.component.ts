import { identifierModuleUrl, ThrowStmt } from '@angular/compiler';
import { Component, OnInit, ɵɵsetComponentScope } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { from, observable, Observable, of, pipe } from 'rxjs';
import { catchError, map, subscribeOn, switchMap, take, tap } from 'rxjs/operators';
import { User } from 'src/app/models/web-authn.model';
import { MockService } from 'src/app/services/mock.service';
import { WebAuthnService } from 'src/app/services/web-authn-service';
import { isSupportBiometricLogin } from './utils/app-util';

@Component({
  selector: 'app-web-authn',
  templateUrl: './web-authn.component.html',
  styleUrls: ['./web-authn.component.scss']
})
export class WebAuthnComponent implements OnInit {
  errorMsg: string = "";
  userList: User[] = [];
  userForm = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
    mobileNumber: new FormControl("", [Validators.required, Validators.pattern("^[0-9]{8}$")]),
    isEnableBiometricLogin: new FormControl(),
  });
  deviceId: string;
  savedCredentialId: Uint8Array;

  flag$: Observable<boolean>;
  authenticator: any = {};
  isSupportBiometricLogin$: Observable<boolean> = isSupportBiometricLogin();
  
  constructor(
    private mockService: MockService,
    private webAuthnService: WebAuthnService,
  ) { }

  ngOnInit(): void {
    this.userList = this.mockService.getAllUser();
    this.deviceId = localStorage.getItem("device_id") || "";
  }

  get email(): any {
    return this.userForm.get('email');
  }

  get mobileNumber(): any {
    return this.userForm.get('mobileNumber');
  }

  get isEnableBiometricLogin(): any {
    return this.userForm.get('isEnableBiometricLogin')
  }

  signup(): void {
    const user: User = {
      mobileNumber: this.userForm.get('mobileNumber').value,
      email: this.userForm.get('email').value,
      credentials: [],
      deviceId: this.deviceId,
    };
    const errorMsgList = this.mockService.validateCreateUser(user);
    if (errorMsgList.length > 0) {
      alert(errorMsgList.toString());
      return;
    }
    const userFromDB = this.mockService.createUser(user);
    this.userList = this.mockService.getAllUser();
    alert("Your Account Has been Created.");
    const isEnableBiometricLogin = this.userForm.get('isEnableBiometricLogin').value;
    if (isEnableBiometricLogin) {
      alert("Enable biometric login...");
      this.webAuthnService.signupFlow(userFromDB).subscribe(response => {
        console.log(response);
        userFromDB.credentials = [{ credentialIdString: response.credentialIdString }]
        userFromDB.authenticatorString = response.authenticatorString;
        this.mockService.updateUser(userFromDB);
        alert("Registration Successful");
      })
    }
  }

  enableBiometricLogin(user: User): void {
    if (user.credentials.length === 0) {
      const isConfirm = confirm("Are you sure you want to enable biometric login?");
      if (isConfirm) this.webAuthnService.signupFlow(user);
    } else {
      const isConfirm = confirm("Are you sure you want to disable biometric login?");
      if (isConfirm) {
        user.credentials = [];
        this.mockService.updateUser(user);
      }
    }
  }

  deleteAccount(user: User): void {
    const isConfirm = confirm(`Are you sure you want to delete this user (${user.email})?`);
    if (isConfirm) this.mockService.deleteUser(user);
  }

  signin(user?: User) {
    let userFromDB: any = { credentials: [] };
    if (user) {
      userFromDB = this.mockService.getUserByMobileNumber(user.mobileNumber);
    } else {
      userFromDB = this.mockService.getUserByDeviceId(this.deviceId);
    };
    console.log("----------Saved User:----------");
    console.log(JSON.stringify(userFromDB));
    this.webAuthnService.signinFlow(userFromDB).subscribe(response => {
      if (response == 'success') {
        alert("Login Successful");
      }
      console.log(response);
    })
  }

}