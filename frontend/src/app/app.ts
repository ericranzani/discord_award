import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './services/api.services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(private apiService: ApiService) {}
  
  ngOnInit(): void {
    this.apiService.getPing().subscribe({
      next: (response) => {
        console.log('Conexão com a API bem-sucedida:', response);
      },
      error: (error) => {
        console.error('Erro ao conectar com a API:', error);
      }
    });
  }
}
