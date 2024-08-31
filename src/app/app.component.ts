import { Component, OnInit } from '@angular/core';
import * as uuid from 'uuid';
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'biometric-login-demo';
  isMock: boolean;
  constructor() { }

  ngOnInit() {
    const deviceId = uuid.v4();
    if (!localStorage.getItem("device_id")) {
      localStorage.setItem("device_id", deviceId);
    };
    this.isMock = localStorage.getItem('isMock') === 'true' ? true : false;
  }

  updateIsMockFlag(event) {
    this.isMock = event;
  }
}
