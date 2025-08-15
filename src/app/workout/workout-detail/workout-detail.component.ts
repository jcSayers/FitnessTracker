import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
@Component({
  selector: 'workout-detail',
  standalone: true,
  templateUrl: 'workout-detail.component.html',
  styleUrls: ['workout-detail.component.scss'],
  imports: [MatDialogModule, MatButtonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class WorkoutDetailComponent implements OnInit {

  ngOnInit(): void {

  }
}
