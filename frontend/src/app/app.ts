import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.services';
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
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
  
  // Sincronizado com os identificadores usados no HTML
  abaAtiva: 'votar' | 'resultados' | 'visualizar' | 'criacao' = 'votar';
  indiceVencedorAtual: number = 0;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.obterOuCriarVotanteId();
    this.carregarCategorias();
  }

  // Gera ou recupera o ID único desse navegador
  obterOuCriarVotanteId() {
    let id = localStorage.getItem('discord_awards_votante_id');
    if (!id) {
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
        this.verificarStatusERecarregar(); 
      },
      error: (err) => console.error('Erro ao alterar estado do evento:', err)
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fotoSelecionada = file;
    }
  }

  salvarCategoria() {
    if (!this.novoNome) return;
    this.apiService.criarCategoria({ nome: this.novoNome, descricao: this.novaDescricao }).subscribe({
      next: () => { 
        this.carregarCategorias(); 
        this.novoNome = ''; 
        this.novaDescricao = ''; 
      }
    });
  }

  salvarCandidato() {
    if (!!this.novoNomeCandidato || !this.categoriaSelecionada) return;

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
    const urlBase = window.location.origin;
    const linkCompleto = `${urlBase}`;

    navigator.clipboard.writeText(linkCompleto).then(() => {
      this.linkCopiadoFeedback = true;
      setTimeout(() => {
        this.linkCopiadoFeedback = false;
      }, 3000);
    }).catch(err => {
      console.error('Erro ao copiar o link: ', err);
      alert('Não foi possível copiar automaticamente. O link é: ' + linkCompleto);
    });
  }

  // Navegação do Slide corrigida para decrementar passo a passo
  proximoVencedor() {
    if (this.indiceVencedorAtual < this.categorias.length - 1) {
      this.indiceVencedorAtual++;
    }
  }

  anteriorVencedor() {
    if (this.indiceVencedorAtual > 0) {
      this.indiceVencedorAtual--;
    }
  }

  toBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        const reader = new FileReader();
        reader.onloadend = function() {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = function() {
        reject(new Error('Falha ao transformar imagem em Base64'));
      };
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    });
  }

  // GERAÇÃO DE PDF OTIMIZADA COM COPIAS DO DOM EM MEMÓRIA (EVITA PÁGINAS EM BRANCO)
  async baixarResultadosPDF() {
    const elementOriginal = document.getElementById('lista-completa-pdf'); 
    if (!elementOriginal) {
      console.error('Contêiner do PDF não encontrado no DOM.');
      return;
    }

    const clone = elementOriginal.cloneNode(true) as HTMLElement;

    clone.style.display = 'block';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    clone.style.width = '1200px'; 
    clone.style.height = 'auto';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px'; 
    clone.style.left = '-9999px';
    clone.style.backgroundColor = '#202225'; 

    document.body.appendChild(clone);

    const imagens = clone.getElementsByTagName('img');
    for (let i = 0; i < imagens.length; i++) {
      const img = imagens[i];
      const srcOriginal = img.src;
      const separador = srcOriginal.includes('?') ? '&' : '?';
      const urlComCacheBuster = `${srcOriginal}${separador}t=${new Date().getTime()}`;

      try {
        const base64Data = await this.toBase64(urlComCacheBuster);
        img.src = base64Data;
      } catch (e) {
        console.warn('Não foi possível converter a imagem no clone: ' + srcOriginal, e);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const opt = {
        margin:       10,
        filename:     'Discord_Awards_Resultados.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#202225',
          logging: false,
          letterRendering: true
        },
        jsPDF:        { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape' 
        }
      } as const;

      await html2pdf().set(opt).from(clone).save();

    } catch (error) {
      console.error('Erro crítico ao gerar o PDF:', error);
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  }
}