import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class Feedback {
  maxLength = 2000;
  message = '';
  email = '';
  firstName = '';
  lastName = '';
  isTestimonial = false;
}
