import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  // Busca todas as categorias cadastradas
  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias/`);
  }

  // Cria uma nova categoria
  criarCategoria(categoria: { nome: string, descricao?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/categorias/`, categoria);
  }

  criarCandidato(nome: string, categoriaId: number, arquivoImagem: File | null): Observable<any> {
    const formData = new FormData();
    
    // O FastAPI espera exatamente estes nomes nos campos
    formData.append('nome', nome);
    formData.append('categoria_id', categoriaId.toString());
    
    if (arquivoImagem) {
      formData.append('file', arquivoImagem, arquivoImagem.name);
    }

    return this.http.post(`${this.apiUrl}/candidatos/`, formData);
  }
}