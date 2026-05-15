import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './services/api.services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  categorias: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.carregarCategorias();
  }

  carregarCategorias() {
    this.apiService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        console.log('Categorias carregadas:', data);
      },
      error: (err) => console.error('Erro ao buscar categorias:', err)
    });
  }
}
