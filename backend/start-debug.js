const { spawn } = require('child_process');

console.log('🚀 Starting backend server in debug mode...');

const server = spawn('npx', ['ts-node-dev', '--respawn', '--transpile-only', '-r', 'tsconfig-paths/register', 'src/index.ts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

server.on('exit', (code) => {
  console.log(`🛑 Server process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
  process.exit(0);
});