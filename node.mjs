import { exec } from 'child_process';
import { access, chmod, constants } from 'fs/promises';
import { platform } from 'os';

const sourceCode = `#version 460 core

// This comment creates a warning because of this: \\
// This is another comment

out vec4 color;

void main() {
	color = vec4(1.0, 1.0, 0.0, 1.0)
}
`;

console.log('START');
const platformName = platform();
await makeFileExecutableIfNeeded();
const result = await runGlslang();
addDiagnostics(result);
console.log('FINISH');

async function makeFileExecutableIfNeeded() {
    if (platformName === 'win32') {
        return true;
    }
    const file = 'glslangMac';
    try {
        await access(file, constants.X_OK);
        console.log('glslang is accessible');
        return true;
    } catch {
        console.log('glslang is not yet accessible');
        // file is not executable
        try {
            await chmod(file, 0o755);
            console.log('glslang is accessible');
            return true;
        } catch {
            console.log('glslang is not accessible');
            // can't make the file executable
            return false;
        }
    }
}

async function runGlslang() {
    return new Promise((resolve) => {
        const command = createGlslangCommand();
        console.log('COMMAND:', command);
        const process = exec(command, (_, stdout, stderr) => {
            console.log('STDOUT:', stdout);
            console.log('STDERR:', stderr);
            resolve(stdout);
        });
        provideInput(process);
    });
}

function createGlslangCommand() {
    const glslang = getGlslangName();
    return `${glslang} --stdin -C -l -S frag`;
}

function getGlslangName() {
    if (platform() === 'win32') {
        return 'glslangWindows';
    } else {
        return './glslangMac';
    }
}

function provideInput(process) {
    process.stdin?.write(sourceCode);
    process.stdin?.end();
}

function addDiagnostics(glslangOutput) {
    const glslangOutputRows = glslangOutput.split('\n');
    for (const glslangOutputRow of glslangOutputRows) {
        addDiagnosticForRow(glslangOutputRow.trim());
    }
}

function addDiagnosticForRow(glslangOutputRow) {
    const regex = /(?<severity>\w+)\s*:\s*((\d+|\w+)\s*:\s*(?<line>\d+)\s*:\s*)?(?:'(?<snippet>.*)'\s*:\s*)?(?<description>.+)/;
    const regexResult = regex.exec(glslangOutputRow);
    if (regexResult?.groups) {
        const severity = regexResult.groups['severity'];
        const line = regexResult.groups['line'];
        const snippet = regexResult.groups['snippet'];
        const description = regexResult.groups['description'];
        console.log(`severity: ${severity}, line: ${line}, snippet: ${snippet}, description: ${description}`);
    }
}
