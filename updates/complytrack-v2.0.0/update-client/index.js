const axios = require('axios');
const semver = require('semver');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UpdateClient {
  constructor(options = {}) {
    this.mainServerUrl = options.mainServerUrl || 'http://localhost:5100';
    this.apiKey = options.apiKey || process.env.COMPLYTRACK_API_KEY;
    this.currentVersion = options.currentVersion || this._readLocalVersion();
    this.component = options.component || 'server';
    this.autoBackup = options.autoBackup !== false;
    this.backupDir = options.backupDir || path.join(process.cwd(), 'backups');
    this.clientDir = options.clientDir || path.join(process.cwd(), 'client');
    this.autoRestart = options.autoRestart !== false;
  }

  _readLocalVersion() {
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '1.0.0';
      }
    } catch {}
    return '1.0.0';
  }

  async checkForUpdates() {
    try {
      const response = await axios.get(`${this.mainServerUrl}/api/updates/check`, {
        headers: { 'x-api-key': this.apiKey },
        params: {
          currentServerVersion: this.component === 'server' || this.component === 'full' ? this.currentVersion : undefined,
          currentClientVersion: this.component === 'client' ? this.currentVersion : undefined
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to check for updates: ${error.message}`);
    }
  }

  async getChangelog(limit = 5) {
    try {
      const response = await axios.get(`${this.mainServerUrl}/api/updates/changelog`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch changelog: ${error.message}`);
    }
  }

  async downloadUpdate(version, destPath) {
    try {
      const response = await axios.get(`${this.mainServerUrl}/api/updates/download/${version}`, {
        headers: { 'x-api-key': this.apiKey },
        responseType: 'stream',
        timeout: 300000
      });

      const filename = `complytrack-v${version}.zip`;
      const filePath = destPath || path.join(this.backupDir, filename);

      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download update: ${error.message}`);
    }
  }

  async backupCurrent() {
    if (!this.autoBackup) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-v${this.currentVersion}-${timestamp}`);

    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const srcDir = process.cwd();
      this._copyDir(srcDir, backupPath, ['node_modules', 'backups', '.git', 'data', 'uploads', 'reports']);

      console.log(`Backup created at ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Backup failed:', error.message);
      return null;
    }
  }

  _copyDir(src, dest, exclude = []) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this._copyDir(srcPath, destPath, exclude);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  _findSourceDir(extractDir) {
    const entries = fs.readdirSync(extractDir, { withFileTypes: true });

    // Check if ZIP has a single root folder (nested structure)
    if (entries.length === 1 && entries[0].isDirectory()) {
      const subDir = path.join(extractDir, entries[0].name);
      const subEntries = fs.readdirSync(subDir, { withFileTypes: true });

      // Check if that folder contains server/client/src structure
      const hasServerDir = subEntries.some(e => e.isDirectory() && e.name === 'server');
      const hasClientDir = subEntries.some(e => e.isDirectory() && e.name === 'client');
      const hasSrcDir = subEntries.some(e => e.isDirectory() && e.name === 'src');

      if (hasServerDir || hasClientDir || hasSrcDir) {
        return subDir;
      }
    }

    // Flat structure — files are at the root of the ZIP
    // Check if extractDir itself contains the expected structure
    const hasServerDir = entries.some(e => e.isDirectory() && e.name === 'server');
    const hasClientDir = entries.some(e => e.isDirectory() && e.name === 'client');
    const hasSrcDir = entries.some(e => e.isDirectory() && e.name === 'src');

    if (hasServerDir || hasClientDir || hasSrcDir) {
      return extractDir;
    }

    // Fallback: return the directory with the most entries
    if (entries.length === 1 && entries[0].isDirectory()) {
      return path.join(extractDir, entries[0].name);
    }

    return extractDir;
  }

  _copyFileOrDir(srcPath, destPath) {
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      this._copyDir(srcPath, destPath, ['node_modules', 'backups', '.git', 'data']);
    } else {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }

  async applyUpdate(updateInfo, options = {}) {
    const { availableVersion, downloadUrl, component } = updateInfo;
    const skipRestart = options.skipRestart || false;

    console.log(`\n========================================`);
    console.log(`  Applying update: v${this.currentVersion} → v${availableVersion}`);
    console.log(`========================================\n`);

    // Step 1: Backup
    console.log('[1/6] Creating backup...');
    const backupPath = await this.backupCurrent();
    console.log('      Backup completed\n');

    // Step 2: Download update
    console.log('[2/6] Downloading update...');
    const updateFile = await this.downloadUpdate(availableVersion);
    console.log(`      Downloaded to: ${updateFile}\n`);

    // Step 3: Extract
    console.log('[3/6] Extracting update...');
    const extractDir = path.join(this.backupDir, `extract-v${availableVersion}`);

    try {
      execSync(`unzip -o "${updateFile}" -d "${extractDir}"`, { stdio: 'pipe' });
    } catch {
      try {
        execSync(`powershell -command "Expand-Archive -Path '${updateFile}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'pipe' });
      } catch (e) {
        throw new Error('Could not extract update. Please install unzip or use PowerShell.');
      }
    }
    console.log('      Extracted successfully\n');

    // Step 4: Find source directory and copy files
    console.log('[4/6] Applying files...');
    const srcDir = this._findSourceDir(extractDir);
    console.log(`      Source: ${srcDir}`);

    const preserveDirs = ['data', 'uploads', 'reports', '.env', 'backups'];

    // Copy server files
    const serverSrc = path.join(srcDir, 'server');
    if (fs.existsSync(serverSrc)) {
      console.log('      Copying server files...');
      this._copyDir(serverSrc, process.cwd(), [...preserveDirs, 'node_modules', '.git']);
    }

    // Copy update-client files
    const updateClientSrc = path.join(srcDir, 'update-client');
    if (fs.existsSync(updateClientSrc)) {
      console.log('      Copying update-client files...');
      this._copyDir(updateClientSrc, path.join(process.cwd(), 'update-client'), ['node_modules']);
    }

    // Copy root-level files (package.json, etc.)
    const rootFiles = fs.readdirSync(srcDir, { withFileTypes: true })
      .filter(e => !e.isDirectory() && !preserveDirs.includes(e.name));
    for (const file of rootFiles) {
      const srcFile = path.join(srcDir, file.name);
      const destFile = path.join(process.cwd(), file.name);
      fs.copyFileSync(srcFile, destFile);
      console.log(`      Updated: ${file.name}`);
    }

    console.log('      Files applied\n');

    // Step 5: Install dependencies if package.json changed
    console.log('[5/6] Checking dependencies...');
    const newPkgPath = path.join(srcDir, 'server', 'package.json');
    const oldPkgPath = path.join(process.cwd(), 'server', 'package.json');

    if (fs.existsSync(newPkgPath) && fs.existsSync(oldPkgPath)) {
      const newPkg = JSON.parse(fs.readFileSync(newPkgPath, 'utf8'));
      const oldPkg = JSON.parse(fs.readFileSync(oldPkgPath, 'utf8'));

      if (JSON.stringify(newPkg.dependencies) !== JSON.stringify(oldPkg.dependencies)) {
        console.log('      Dependencies changed, running npm install...');
        execSync('cd server && npm install --production', { stdio: 'inherit' });
        console.log('      Dependencies installed');
      } else {
        console.log('      No dependency changes');
      }
    }

    // Step 6: Rebuild client if it exists
    console.log('\n[6/6] Rebuilding client...');
    const clientDir = path.join(process.cwd(), 'client');
    if (fs.existsSync(path.join(clientDir, 'package.json'))) {
      try {
        console.log('      Installing client dependencies...');
        execSync('cd client && npm install', { stdio: 'pipe' });
        console.log('      Building client...');
        execSync('cd client && npm run build', { stdio: 'pipe' });
        console.log('      Client rebuilt successfully');
      } catch (err) {
        console.error('      Client build failed:', err.message);
        console.log('      You may need to rebuild the client manually');
      }
    } else {
      console.log('      No client directory found, skipping');
    }

    // Step 7: Report update applied
    console.log('\nReporting update to main server...');
    await this.reportUpdateApplied(this.currentVersion, availableVersion, component);

    // Cleanup extraction directory
    try {
      fs.rmSync(extractDir, { recursive: true, force: true });
    } catch {}

    console.log(`\n========================================`);
    console.log(`  Update to v${availableVersion} completed!`);
    console.log(`========================================\n`);

    // Step 8: Auto-restart (unless skipped)
    if (this.autoRestart && !skipRestart) {
      console.log('Restarting server in 3 seconds...');
      setTimeout(() => {
        try {
          // Try to restart using PM2 if available
          execSync('pm2 restart complytrack-server 2>/dev/null || pm2 restart all 2>/dev/null', { stdio: 'pipe' });
          console.log('Server restarted via PM2');
        } catch {
          try {
            // Try nodemon restart signal
            process.kill(process.ppid, 'SIGUSR2');
            console.log('Restart signal sent to parent process');
          } catch {
            console.log('\n*** Please restart the server manually ***');
            console.log('    Run: npm restart (or pm2 restart complytrack-server)');
          }
        }
      }, 3000);
    } else {
      console.log('Restart the server to apply changes.');
    }

    return {
      success: true,
      fromVersion: this.currentVersion,
      toVersion: availableVersion,
      backupPath
    };
  }

  async reportUpdateApplied(fromVersion, toVersion, component) {
    try {
      await axios.post(`${this.mainServerUrl}/api/updates/applied`, {
        fromVersion,
        toVersion,
        component: component || this.component,
        status: 'success'
      }, {
        headers: { 'x-api-key': this.apiKey }
      });
      console.log('Update reported to main server');
    } catch (error) {
      console.error('Failed to report update:', error.message);
    }
  }

  async rollback(backupPath) {
    if (!backupPath || !fs.existsSync(backupPath)) {
      throw new Error('Backup path not found');
    }

    console.log('Rolling back to previous version...');

    const preserveDirs = ['data', 'uploads', 'reports', '.env'];
    this._copyDir(backupPath, process.cwd(), [...preserveDirs, 'node_modules', 'backups']);

    console.log('Rollback completed. Restart the server.');
    return { success: true };
  }
}

module.exports = UpdateClient;
