const fs = require('fs');
let content = fs.readFileSync('queue-tasks.ts', 'utf-8');
const lines = content.split('\n');

// Find and fix lines 316-326 (dry-run section with broken syntax)
const fixedDryRun = `  if (args.dryRun) {
    console.log("DRY RUN - Queue order:\n");
    pendingTasks.forEach((task, index) => {
      const deps = task.depends_on.length > 0 ? \` (deps: \${task.depends_on.join(", ")})\` : "";
      console.log(\`  #\${index + 1} \${task.id}: \${task.title}\${deps}\`);
    });
    console.log("\nRun without --dry-run to queue tasks.");
    process.exit(0);
  }`;

// Find the dry-run block start and replace until the closing }
let startLine = -1;
let endLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'if (args.dryRun) {') {
    startLine = i;
  }
  if (startLine >= 0 && i > startLine && lines[i].includes('process.exit(0);')) {
    // Find the closing brace after process.exit
    for (let j = i; j < i + 3 && j < lines.length; j++) {
      if (lines[j].trim() === '}') {
        endLine = j;
        break;
      }
    }
    break;
  }
}

if (startLine >= 0 && endLine >= 0) {
  // Remove lines from startLine to endLine and insert fixed version
  lines.splice(startLine, endLine - startLine + 1, ...fixedDryRun.split('\n'));
  console.log(`Fixed dry-run block from line ${startLine + 1} to ${endLine + 1}`);
} else {
  console.log('Could not find dry-run block:', startLine, endLine);
}

fs.writeFileSync('queue-tasks.ts', lines.join('\n'));
