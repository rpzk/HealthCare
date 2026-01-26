# 💾 Backups: o que é coberto (estado atual)

Este documento descreve **o que existe no repositório hoje** e o que depende de configuração/operacionalização. Ele não é uma “garantia” de que nunca haverá perda de dados.

## ✅ O que o backup de banco cobre

O backup de banco é feito via `pg_dump` e gera um arquivo `healthcare_<timestamp>.sql.gz`.

Isso **cobre o que está armazenado no PostgreSQL**, por exemplo:
- cadastros (pacientes, profissionais, usuários)
- consultas/atendimentos, prescrições, solicitações de exame
- prontuários, questionários, logs/auditoria

Em outras palavras: se um dado está persistido no banco, ele pode ser incluído no dump.

## ⚠️ O que NÃO está coberto automaticamente por dump do banco

Um `pg_dump` **não inclui arquivos do sistema de arquivos** (por exemplo conteúdos em `/app/uploads`).

Exemplos comuns de itens que podem ficar fora do backup do banco, dependendo de como foram salvos:
- anexos/arquivos enviados (uploads)
- PDFs/assinaturas armazenados como arquivo
- gravações de telemedicina armazenadas como arquivo

Se esses itens forem importantes para seu cenário, precisa existir **backup de arquivos** além do dump do banco.

## 📁 Onde os backups ficam

No deployment padrão em Docker, o caminho é controlado por `BACKUPS_DIR` (por padrão `/app/backups`). Em produção, esse diretório costuma ser montado em um volume/pasta do host.

## ♻️ Restauração

A restauração de um backup **sobrescreve o banco atual**. É uma operação administrativa e deve ser feita com cuidado.

Recomendação operacional:
- manter backups em um local fora do servidor (offsite) se necessário
- testar restore em um ambiente de homologação antes de depender do processo

## ✅ Como verificar na prática (sem suposições)

Você consegue validar o que está sendo gerado olhando os arquivos no diretório de backup e conferindo se o arquivo `healthcare_<timestamp>.sql.gz` existe e passa no teste de integridade (`gunzip -t`).
