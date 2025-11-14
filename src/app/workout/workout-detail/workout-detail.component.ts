import { ChangeDetectionStrategy, Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SvgIconComponent } from "../../shared";

@Component({
  selector: 'workout-detail',
  standalone: true,
  templateUrl: 'workout-detail.component.html',
  styleUrls: ['workout-detail.component.scss'],
  imports: [CommonModule, FormsModule, SvgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class WorkoutDetailComponent implements OnInit {

  ngOnInit(): void {

  }

  onCancel(): void {
    // Handle cancel action
  }

  onInstall(): void {
    // Handle install action
  }
}
