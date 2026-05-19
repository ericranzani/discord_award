import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
  votanteId: string = '';

  // Variáveis para o formulário
  novoNome: string = '';
  novaDescricao: string = '';
  novoNomeCandidato: string = '';
  categoriaSelecionada: number | null = null;
  fotoSelecionada: File | null = null;

  indiceCategoriaAtual: number = 0;
  votacaoConcluida: boolean = false;
  votacaoEncerradaGlobal: boolean = false;
  linkCopiadoFeedback: boolean = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.obterOuCriarVotanteId();
    this.carregarCategorias();
  }

  // Gera ou recupera o ID único desse navegador
  obterOuCriarVotanteId() {
    let id = localStorage.getItem('discord_awards_votante_id');
    if (!id) {
      // Cria uma string aleatória simples simulando um ID único
      id = 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('discord_awards_votante_id', id);
    }
    this.votanteId = id;
  }

  // Verifica se o evento acabou e traz os dados atualizados
  verificarStatusERecarregar() {
    this.apiService.getStatusVotacao().subscribe({
      next: (status) => {
        this.votacaoEncerradaGlobal = status.votacao_encerrada;
        this.carregarCategorias();
      },
      error: (err) => console.error('Erro ao buscar status da votação:', err)
    });
  }

  carregarCategorias() {
    this.apiService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        // Se a lista vier do backend dizendo que está encerrada, sincroniza o layout
        if (data.length > 0 && data[0].votacao_encerrada) {
          this.votacaoEncerradaGlobal = true;
        }
      },
      error: (err) => console.error('Erro ao buscar categorias:', err)
    });
  }

  // Função principal de Votação
  votarNoCandidato(candidatoId: number) {
    const categoriaAtual = this.categorias[this.indiceCategoriaAtual];

    this.apiService.enviarVoto(categoriaAtual.id, candidatoId, this.votanteId).subscribe({
      next: () => {
        console.log('Voto registrado com sucesso!');
        this.avancarCategoria();
      },
      error: (err) => {
        // Se o backend disser que ele já votou, avança de qualquer forma para não travar a tela
        alert(err.error.detail || 'Erro ao votar. Avançando...');
        this.avancarCategoria();
      }
    });
  }

  avancarCategoria() {
    if (this.indiceCategoriaAtual < this.categorias.length - 1) {
      this.indiceCategoriaAtual++;
    } else {
      this.votacaoConcluida = true;
    }
  }

  alternarFechamentoEvento() {
    this.apiService.alternarStatusVotacao().subscribe({
      next: (res) => {
        this.votacaoEncerradaGlobal = res.votacao_encerrada;
        this.verificarStatusERecarregar(); // Força o recalculo e puxa os vencedores
      },
      error: (err) => console.error('Erro ao alterar estado do evento:', err)
    });
  }

  // Função para capturar a foto quando o usuário escolher o arquivo
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fotoSelecionada = file;
    }
  }

  salvarCategoria() {
    if (!this.novoNome) return;
    this.apiService.criarCategoria({ nome: this.novoNome, descricao: this.novaDescricao }).subscribe({
      next: () => { this.carregarCategorias(); this.novoNome = ''; this.novaDescricao = ''; }
    });
  }

  salvarCandidato() {
    if (!this.novoNomeCandidato || !this.categoriaSelecionada) return;

    this.apiService.criarCandidato(
      this.novoNomeCandidato, 
      this.categoriaSelecionada, 
      this.fotoSelecionada
    ).subscribe({
      next: () => {
        this.carregarCategorias(); 
        this.novoNomeCandidato = ''; 
        this.fotoSelecionada = null;

        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err) => console.error('Erro ao salvar candidato:', err)
    });
  }

  gerarECopiarLinkVotacao() {
    // Pega o protocolo e host atual (ex: http://localhost:4200)
    const urlBase = window.location.origin;
    
    const linkCompleto = `${urlBase}`;

    // Copia nativamente para a área de transferência do sistema operacional
    navigator.clipboard.writeText(linkCompleto).then(() => {
      // Ativa o feedback visual no botão
      this.linkCopiadoFeedback = true;
      
      // Some com a mensagem de feedback após 3 segundos
      setTimeout(() => {
        this.linkCopiadoFeedback = false;
      }, 3000);
    }).catch(err => {
      console.error('Erro ao copiar o link: ', err);
      alert('Não foi possível copiar automaticamente. O link é: ' + linkCompleto);
    });
  }
}
