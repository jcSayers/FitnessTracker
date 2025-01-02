import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
@Component({
  selector: 'sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  standalone:true,
  imports:[RouterModule,RouterOutlet]
})
export class SignInComponent {
  title = 'FitnessTracker';
}
