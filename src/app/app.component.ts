import { NgFor } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {provideRouter, Router, RouterOutlet } from '@angular/router'
import {MatButtonModule} from '@angular/material/button'
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports:[NgFor,MatButtonModule]
    
})
export class AppComponent implements OnInit{
  title = 'FitnessTracker';

  ngOnInit(): void {
    
  }
}
