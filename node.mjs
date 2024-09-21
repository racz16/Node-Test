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
await runGlslang();
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
