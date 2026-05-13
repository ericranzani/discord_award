import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // URL do seu container FastAPI
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  // Método para testar a conexão com o endpoint "/"
  getPing(): Observable<any> {
    return this.http.get(`${this.apiUrl}/`);
  }
}