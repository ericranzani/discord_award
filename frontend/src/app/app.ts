import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  categorias: any[] = [];

  // Variáveis para o formulário
  novoNome: string = '';
  novaDescricao: string = '';
  novoNomeCandidato: string = '';
  categoriaSelecionada: number | null = null;

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
  
  salvarCategoria() {
    if (!this.novoNome) return;

    const novaCategoria = { nome: this.novoNome, descricao: this.novaDescricao };
    
    this.apiService.criarCategoria(novaCategoria).subscribe({
      next: () => {
        this.carregarCategorias(); // Recarrega a lista
        this.novoNome = '';        // Limpa os campos
        this.novaDescricao = '';
      }
    });
  }

  salvarCandidato() {
    if (!this.novoNomeCandidato || !this.categoriaSelecionada) return;

    this.apiService.criarCandidato(this.novoNomeCandidato, this.categoriaSelecionada).subscribe({
      next: () => {
        this.carregarCategorias(); // Recarrega para mostrar o candidato na lista
        this.novoNomeCandidato = '';
      }
    });
  }
}
