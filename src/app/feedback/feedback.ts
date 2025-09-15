import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class Feedback {
  maxLength = 2000;
  message = '';
  email = '';
  firstName = '';
  lastName = '';
}
