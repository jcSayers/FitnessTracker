import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Inject, OnInit } from '@angular/core';
import {provideRouter, Router, RouterOutlet } from '@angular/router'
import {MatButtonModule} from '@angular/material/button'
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import { WorkoutDetailComponent } from './workout/workout-detail/workout-detail.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports:[NgFor,MatButtonModule,MatDialogModule],
    changeDetection : ChangeDetectionStrategy.OnPush
    
    
})

export class AppComponent implements OnInit{
  title = 'FitnessTracker';
  readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    
  }
    openDialog() {
      const dialogRef = this.dialog.open(WorkoutDetailComponent);
  
      dialogRef.afterClosed().subscribe(result => {
        console.log(`Dialog result: ${result}`);
      });
    }
  
}
