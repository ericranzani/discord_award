import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.services';
import jsPDF from 'jspdf';

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
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    
    if (fileList && fileList.length > 0) {
      this.fotoSelecionada = fileList[0];
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


  private carregarImagem(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // Evita problemas de CORS com o Docker/Backend
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  // GERAÇÃO DE PDF OTIMIZADA COM COPIAS DO DOM EM MEMÓRIA (EVITA PÁGINAS EM BRANCO)
  async baixarResultadosPDF() {
    if (!this.categorias || this.categorias.length === 0) return;

    // 1. Instancia o jsPDF em formato Paisagem (Landscape)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const larguraPagina = 297;
    let y = 20;

    // 2. Desenha o fundo escuro geral do relatório (#1e1f22 ou #2f3136)
    doc.setFillColor(30, 31, 34);
    doc.rect(0, 0, larguraPagina, 210, 'F');

    // Cabeçalho do PDF (Removidos emojis do texto para evitar bugs de encoding)
    doc.setTextColor(250, 166, 26); // Amarelo Discord
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('DISCORD AWARDS', larguraPagina / 2, y, { align: 'center' });

    y += 8;
    doc.setTextColor(185, 187, 190); // Cinza claro
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Relatorio Oficial de Vencedores do Ano', larguraPagina / 2, y, { align: 'center' });
    
    y += 15;

    // 3. Iterar pelas categorias buscando renderizar os cards horizontais
    for (const cat of this.categorias) {
      // Validação de quebra de página se o espaço vertical estourar
      if (y > 150) {
        doc.addPage();
        doc.setFillColor(30, 31, 34);
        doc.rect(0, 0, larguraPagina, 210, 'F');
        y = 16; // Margem inicial do topo da nova folha
      }

      // Altura customizada do card para caber a imagem proporcional à do app
      const alturaCard = 80; 

      // Desenha a estrutura interna do card com a borda amarela do Discord
      doc.setDrawColor(250, 166, 26);
      doc.setLineWidth(0.6);
      doc.setFillColor(47, 49, 54); // Cor do card (#2f3136)
      doc.roundedRect(20, y, larguraPagina - 40, alturaCard, 4, 4, 'FD');

      // --- COLUNA DA ESQUERDA: IMAGEM DO VENCEDOR (Estilo a do App) ---
      const larguraImg = 70;
      const alturaImg = alturaCard - 6; // Pequena margem interna de 3mm
      const posImgX = 23;
      const posImgY = y + 3;

      if (cat.vencedor && cat.vencedor.imagem_url) {
        try {
          // Carrega a imagem dinamicamente para poder injetá-la no Canvas do PDF
          const imgElement = await this.carregarImagem(cat.vencedor.imagem_url);
          doc.addImage(imgElement, 'JPEG', posImgX, posImgY, larguraImg, alturaImg, undefined, 'FAST');
        } catch (error) {
          // Fallback gráfico se a imagem falhar (desenha um quadrado cinza)
          doc.setFillColor(66, 69, 74);
          doc.rect(posImgX, posImgY, larguraImg, alturaImg, 'F');
        }
      } else {
        // Fallback sem imagem (Padrão cinza do Discord)
        doc.setFillColor(66, 69, 74);
        doc.rect(posImgX, posImgY, larguraImg, alturaImg, 'F');
      }

      // --- COLUNA DA DIREITA: TEXTOS E INFORMAÇÕES (Empilhados dinamicamente) ---
      // Começa logo após o espaço ocupado pela imagem (23mm iniciais + 45mm da imagem + 8mm de espaçamento)
      const posXTexto = posImgX + larguraImg + 8; 

      // 1. Status / Indicador roxo do topo ("REVELANDO" ou "VENCEDOR")
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(114, 137, 218); // Azul/Roxo Blurple do Discord (#7289da)
      doc.text('CATEGORIA CONCLUIDA', posXTexto, y + 8);

      // 2. Nome da Categoria (Título do Bloco)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255); // Branco puro
      doc.text(cat.nome, posXTexto, y + 15);

      // 3. Descrição da Categoria
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(185, 187, 190); // Cinza secundário
      doc.text(`"${cat.descricao || ''}"`, posXTexto, y + 21);

      // Linha divisória interna sutil (Cinza escuro)
      doc.setDrawColor(66, 69, 74);
      doc.setLineWidth(0.3);
      doc.line(posXTexto, y + 25, larguraPagina - 25, y + 25);

      // 4. Nome do Ganhador em Destaque Grande (Laranja/Amarelo)
      if (cat.vencedor) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(250, 166, 26); // Amarelo Destaque
        doc.text(cat.vencedor.nome, posXTexto, y + 34);

        // 5. Quantidade de votos (Texto em verde sucesso igual ao app)
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(67, 181, 129); // Verde Discord (#43b581)
        doc.text(`${cat.vencedor.votos} votos computados`, posXTexto, y + 41);
      } else {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(114, 118, 125);
        doc.text('Nenhum voto computado', posXTexto, y + 34);
      }

      // Avança o Y adicionando o tamanho do card + espaçamento confortável entre eles
      y += alturaCard + 4;
    }

    // 4. Salva o arquivo gerado de forma limpa
    doc.save('Discord_Awards_Resultados.pdf');
  }
}