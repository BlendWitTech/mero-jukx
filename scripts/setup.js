const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const inquirerPath = path.join(__dirname, '..', 'node_modules', 'inquirer');
const dependencyExists = fs.existsSync(inquirerPath);

if (!dependencyExists) {
    console.log('Installing setup dependencies...');
    // Install in the root where package.json is
    const result = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        shell: true
    });

    if (result.status !== 0) {
        console.error('\x1b[31m%s\x1b[0m', 'Failed to install dependencies automatically.');
        console.error('Please run "npm install" manually and then try running "npm run setup" again.');
        process.exit(1);
    }
}

const isWindows = process.platform === 'win32';

async function main() {
    console.clear();
    console.log('\x1b[36m%s\x1b[0m', 'Mero Jugx - Interactive Setup');
    console.log('===================================');

    const { default: inquirer } = await import('inquirer');

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'How would you like to set up the project?',
            choices: [
                { name: 'Manual Setup (Local Node/Postgres)', value: 'manual' },
                { name: 'Docker Setup (Recommended)', value: 'docker' },
            ],
        },
        {
            type: 'confirm',
            name: 'confirm',
            message: 'This will install dependencies and configure .env files. Continue?',
            default: true,
        }
    ]);

    if (!answers.confirm) {
        console.log('Setup aborted.');
        process.exit(0);
    }

    const scriptName = answers.type === 'docker' ? 'setup-docker' : 'setup-manual';

    console.log('\n> Generating .env files from examples...');
    try {
        require('./generate-env');
    } catch (e) {
        console.warn('Failed to generate .env files:', e.message);
    }

    runScript(scriptName);
}

function runScript(scriptName) {
    const scriptsDir = __dirname;
    let command = '';
    let shellArgs = [];

    if (isWindows) {
        const scriptPath = path.join(scriptsDir, `${scriptName}.ps1`);
        if (!fs.existsSync(scriptPath)) {
            console.error(`Script not found: ${scriptPath}`);
            return;
        }
        command = 'powershell';
        shellArgs = ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-File', scriptPath];
    } else {
        const scriptPath = path.join(scriptsDir, `${scriptName}.sh`);
        if (!fs.existsSync(scriptPath)) {
            console.error(`Script not found: ${scriptPath}`);
            return;
        }
        command = 'bash';
        shellArgs = [scriptPath];
    }

    console.log(`\n> Running: ${scriptName}\n`);

    const child = spawn(command, shellArgs, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: process.env
    });

    child.on('error', (err) => {
        console.error(`Failed to start script: ${err.message}`);
    });
}

main();
