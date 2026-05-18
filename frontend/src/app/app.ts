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
  fotoSelecionada: File | null = null;

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

  // Função para capturar a foto quando o usuário escolher o arquivo
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fotoSelecionada = file;
    }
  }

  salvarCandidato() {
    if (!this.novoNomeCandidato || !this.categoriaSelecionada) return;

    this.apiService.criarCandidato(
      this.novoNomeCandidato, 
      this.categoriaSelecionada, 
      this.fotoSelecionada
    ).subscribe({
      next: () => {
        this.carregarCategorias(); // Recarrega a lista atualizada
        this.novoNomeCandidato = ''; // Limpa os campos
        this.fotoSelecionada = null;
        // Truque para limpar o campo de arquivo no HTML
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err) => console.error('Erro ao salvar candidato:', err)
    });
  }
}
