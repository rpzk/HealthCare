#!/usr/bin/env node

/**
 * Script de teste dos endpoints WebRTC
 * Verifica connectividade da API de teleconsulta
 */

const http = require('http');
const https = require('https');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const tests = [];

// Cores para terminal
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    ok: res.statusCode >= 200 && res.statusCode < 300
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function testEndpoint(name, url, expectedStatus = 200) {
    log('yellow', `⏳ Testando: ${name}`);
    try {
        const result = await request(url);
        const passed = result.ok || result.status === expectedStatus;
        
        if (passed) {
            log('green', `✅ ${name} (${result.status})`);
            tests.push({ name, passed: true });
        } else {
            log('red', `❌ ${name} (esperado ${expectedStatus}, got ${result.status})`);
            tests.push({ name, passed: false });
        }
    } catch (error) {
        log('red', `❌ ${name} - ${error.message}`);
        tests.push({ name, passed: false, error: error.message });
    }
}

async function runTests() {
    console.log('');
    log('cyan', '╔════════════════════════════════════════════════════════╗');
    log('cyan', '║   🧪 TESTE DE ENDPOINTS - HealthCare Teleconsulta     ║');
    log('cyan', '╚════════════════════════════════════════════════════════╝');
    console.log('');

    log('blue', `📍 API Base: ${API_BASE}`);
    console.log('');

    // Teste básico de conectividade
    log('blue', '--- CONECTIVIDADE ---');
    await testEndpoint('Health check', `${API_BASE}/api/health`, 200);

    // Testes de APIs WebRTC
    log('blue', '\n--- APIs WebRTC ---');
    await testEndpoint('Config TURN/STUN', `${API_BASE}/api/tele/config`, 200);

    // Testes de páginas
    log('blue', '\n--- PÁGINAS ---');
    await testEndpoint('Página de diagnóstico', `${API_BASE}/diagnostics/webrtc`, 200);
    await testEndpoint('Página de teste', `${API_BASE}/test-telemedicine.html`, 200);

    // Resumo
    console.log('');
    log('cyan', '╔════════════════════════════════════════════════════════╗');
    
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    const percentage = Math.round((passed / tests.length) * 100);

    log('cyan', `║  Resultados: ${passed}/${tests.length} testes passaram        `);
    log('cyan', `║  Taxa de sucesso: ${percentage}%                            `);
    log('cyan', '╚════════════════════════════════════════════════════════╝');

    if (failed > 0) {
        console.log('');
        log('red', '❌ Alguns testes falharam:');
        tests.filter(t => !t.passed).forEach(t => {
            log('red', `   - ${t.name}${t.error ? ': ' + t.error : ''}`);
        });
        process.exit(1);
    } else {
        console.log('');
        log('green', '✅ Todos os testes passaram! Sistema está operacional.');
        process.exit(0);
    }
}

// Aguardar um pouco para servidor iniciar
setTimeout(runTests, 1000);
