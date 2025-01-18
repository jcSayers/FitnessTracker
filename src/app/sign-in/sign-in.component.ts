import { Component } from '@angular/core';
import {RouterOutlet } from '@angular/router'
import { OnInit } from '@angular/core';

@Component({
  selector: 'sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  standalone:true,
  imports:[RouterOutlet]
})
export class SignInComponent {
  title = 'FitnessTracker';
  ngOnInit(){
    
    debugger
  }
}
