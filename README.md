# 🌿 CATARSE — Bem-Estar Social

> **"Não queremos que o utilizador fique viciado, queremos que ele se sinta nutrido."**

O **Catarse** é um MVP funcional de uma rede social alternativa baseada em "Slow Tech". Diferente das plataformas tradicionais que procuram o envolvimento infinito e a dopamina barata, o Catarse propõe uma **economia de interação consciente** e um ambiente focado na saúde mental e na cura visual.

---

## ✨ A Visão
Nascido da necessidade de um refúgio digital, o Catarse substitui o "like" vazio pela **VIBE** energia social (Verdade Integrada e Bem-Estar Emocional). 
Aqui, cada interação tem um custo e cada criação tem um valor, forçando uma presença digital mais intencional e menos ruidosa.

---

## 🚀 O que já está implementado (Realidade no Código)

O projeto já possui uma arquitetura robusta e serviços funcionais:

### 💎 Economia de VIBES
* **Interação Consciente:** As ações de *Zapping* (curtir) e Comentar consomem VIBES do saldo do utilizador (`TransactionService.ts`).
* **Recompensa por Criação:** Publicar conteúdo gera VIBES para o autor, incentivando a partilha de valor.
* **Orvalho Diário:** Sistema lógico para distribuição de energia diária não acumulável, incentivando a generosidade.

### 📱 Experiência do Utilizador (UI/UX)
* **Feed Cronológico:** Navegação real por tempo e filtros de tags emocionais (`#Paz`, `#Desabafo`, `#Gratidão`).
* **Átrio da Leveza:** Espaço de imersão visual focado em imagens de contemplação (`AtrioLeveza.tsx`).
* **Catálogo de Comunidades:** Sistema de navegação por grupos temáticos com feeds independentes.
* **Perfil Completo:** Gestão de conexões, histórico de publicações e galeria pessoal.

### ⚙️ Infraestrutura Técnica
* **Arquitetura de Serviços:** Separação clara entre `PostService`, `TransactionService`, `ConnectionService` e `CommunityService`.
* **Persistência de Dados:** Schema SQL pronto para **Supabase** (Auth, Tabelas de Perfis, Posts e Transações).
* **Design System:** Implementado com Tailwind CSS, focado em "Dark Mode" de baixo contraste para reduzir a fadiga ocular.

---

## 🛠️ Stack Tecnológica
* **Frontend:** React 18 + Vite + TypeScript.
* **Estilização:** Tailwind CSS + Lucide Icons.
* **Backend as a Service:** Supabase (PostgreSQL, Auth, Storage).
* **Arquitetura:** Service-Oriented Architecture (SOA).

---

## ⏳ Roadmap (O que virá a seguir)

O projeto está preparado para as seguintes integrações futuras:

1.  **Moderação por IA (Google Gemini):** Integração real com o Gemini para análise de "Nível de Leveza" e bloqueio de toxicidade (atualmente em mock).
2.  **Santuário Pessoal:** Funcionalidade de coleções privadas e curadoria de imagens no Átrio.
3.  **Verificação de Saúde:** Selo de autoridade para profissionais (CRM/CRP/Ordens de Portugal) com integração IDV.
4.  **Comunicação em Tempo Real:** Implementação de chamadas de voz e vídeo (Calls) em grupo nas comunidades.
5.  **Jardim da Alma:** Gamificação orgânica onde o perfil evolui visualmente (semente para árvore) com base nas Vibes recebidas.

---

## 📋 Como Executar o Projeto

1.  **Clonar o repositório:**
    ```bash
    git clone [https://github.com/teu-utilizador/catarse.git](https://github.com/teu-utilizador/catarse.git)
    ```
2.  **Instalar dependências:**
    ```bash
    npm install
    ```
3.  **Configurar Variáveis de Ambiente:**
    Cria um ficheiro `.env` com as tuas credenciais do Supabase:
    ```env
    VITE_SUPABASE_URL=tu_url_aqui
    VITE_SUPABASE_ANON_KEY=tua_chave_aqui
    ```
4.  **Iniciar o servidor:**
    ```bash
    npm run dev
    ```

---

## 🤝 Manifesto
O Catarse não promete felicidade instantânea. Promete **espaço**. 
Aqui, não precisas de atuar ou performar. Existir e partilhar a tua verdade já é o suficiente.

---
*Projeto desenvolvido com foco em Portugal e Brasil, respeitando as normas de RGPD e LGPD.* 🌿