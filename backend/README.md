# Qalau backend (Go)

API для синхронизации целей между устройствами. Требуется Go 1.25+.

```bash
cd backend
go test ./...          # все тесты
go run ./cmd/server    # запустить сервер (после задачи 1)
```

## Структура

```
cmd/server/      точка входа: main.go — конфиг, запуск и остановка HTTP-сервера
internal/api/    HTTP-слой: маршруты и хендлеры
```

`internal/` — пакеты, которые Go не даст импортировать из других модулей: это код только этого сервиса.

## Задачи

### 1. Health-check ← сейчас

Тест: [internal/api/health_test.go](internal/api/health_test.go). Сейчас он даже не компилируется (`undefined: NewHandler`) — это нормально, так начинается TDD.

1. В пакете `api` напишите `func NewHandler() http.Handler`:
   - маршрут `GET /api/health` отвечает `200` и JSON `{"status":"ok"}` с заголовком `Content-Type: application/json`;
   - другой метод на этом пути — `405`, неизвестный путь — `404`.

   Подсказка: `http.NewServeMux()` с Go 1.22 понимает метод в шаблоне маршрута; JSON пишется через `encoding/json`.
2. Добейтесь, чтобы `go test ./...` был зелёным.
3. Напишите `cmd/server/main.go`:
   - порт из переменной окружения `PORT`, по умолчанию `8080`;
   - запуск `http.Server` с `NewHandler()`;
   - по Ctrl+C (SIGINT/SIGTERM) сервер завершает текущие запросы и останавливается, а не обрывает их.

   Подсказка: `signal.NotifyContext` и `(*http.Server).Shutdown`.
4. Проверьте руками: `go run ./cmd/server`, затем `curl -i localhost:8080/api/health`.

Когда тесты зелёные — отправляйте на ревью.

### Дальше
2. Вход через Telegram · 3. `GET/PUT /api/state` в Postgres · 4. Синхронизация на фронте · 5. Слияние конфликтов · 6. Деплой
