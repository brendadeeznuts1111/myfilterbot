/**
 * File Scanner with fs.glob improvements
 * Bun v1.2.18: fs.glob now matches directories by default
 */

import { glob } from 'fs/promises';
import { stat } from 'fs/promises';
import path from 'path';

export interface ScanResult {
  files: string[];
  directories: string[];
  totalSize: number;
  fileCount: number;
  directoryCount: number;
}

export class FileScanner {
  /**
   * Scan directory with improved glob pattern matching
   * Bun v1.2.18: Now includes directories in results
   */
  static async scanDirectory(
    pattern: string,
    options: {
      includeDirectories?: boolean;
      excludePatterns?: string[];
      maxDepth?: number;
    } = {}
  ): Promise<ScanResult> {
    const {
      includeDirectories = true, // Now true by default in Bun v1.2.18
      excludePatterns = [],
      maxDepth,
    } = options;

    try {
      // Use fs.glob with new directory matching behavior
      const allPaths = await glob(pattern, {
        // Bun v1.2.18: Directories are now included by default
        withFileTypes: false,
        exclude: excludePatterns,
      });

      const files: string[] = [];
      const directories: string[] = [];
      let totalSize = 0;

      // Separate files and directories
      for (const filePath of allPaths) {
        try {
          const stats = await stat(filePath);

          if (stats.isDirectory()) {
            if (includeDirectories) {
              directories.push(filePath);
            }
          } else if (stats.isFile()) {
            files.push(filePath);
            totalSize += stats.size;
          }
        } catch (error) {
          console.warn(`Failed to stat ${filePath}:`, error);
        }
      }

      return {
        files,
        directories,
        totalSize,
        fileCount: files.length,
        directoryCount: directories.length,
      };
    } catch (error) {
      console.error('Scan failed:', error);
      return {
        files: [],
        directories: [],
        totalSize: 0,
        fileCount: 0,
        directoryCount: 0,
      };
    }
  }

  /**
   * Find all TypeScript files including directories
   */
  static async findTypeScriptFiles(rootDir: string): Promise<ScanResult> {
    return this.scanDirectory(path.join(rootDir, '**/*.{ts,tsx}'), {
      excludePatterns: ['node_modules/**', 'dist/**', '.git/**'],
    });
  }

  /**
   * Find all test files
   */
  static async findTestFiles(rootDir: string): Promise<ScanResult> {
    return this.scanDirectory(
      path.join(rootDir, '**/*.{test,spec}.{ts,tsx,js,jsx}'),
      {
        excludePatterns: ['node_modules/**', 'dist/**'],
      }
    );
  }

  /**
   * Find configuration files
   */
  static async findConfigFiles(rootDir: string): Promise<string[]> {
    const patterns = [
      '*.config.{js,ts,json}',
      '.*.{json,yml,yaml}',
      'package.json',
      'tsconfig.json',
      'bunfig.toml',
    ];

    const results = await Promise.all(
      patterns.map(pattern =>
        glob(path.join(rootDir, pattern), {
          // Include dot files
          dot: true,
        })
      )
    );

    return results.flat();
  }

  /**
   * Get project structure overview
   */
  static async getProjectStructure(rootDir: string): Promise<{
    sourceFiles: ScanResult;
    testFiles: ScanResult;
    configFiles: string[];
    statistics: {
      totalFiles: number;
      totalDirectories: number;
      totalSizeKB: number;
      averageFileSizeKB: number;
    };
  }> {
    const [sourceFiles, testFiles, configFiles] = await Promise.all([
      this.scanDirectory(path.join(rootDir, 'src/**/*')),
      this.findTestFiles(rootDir),
      this.findConfigFiles(rootDir),
    ]);

    const totalFiles =
      sourceFiles.fileCount + testFiles.fileCount + configFiles.length;
    const totalDirectories =
      sourceFiles.directoryCount + testFiles.directoryCount;
    const totalSize = sourceFiles.totalSize + testFiles.totalSize;

    return {
      sourceFiles,
      testFiles,
      configFiles,
      statistics: {
        totalFiles,
        totalDirectories,
        totalSizeKB: totalSize / 1024,
        averageFileSizeKB: totalFiles > 0 ? totalSize / 1024 / totalFiles : 0,
      },
    };
  }

  /**
   * Watch for file changes using glob patterns
   */
  static async *watchFiles(
    pattern: string,
    callback?: (event: 'add' | 'change' | 'delete', filePath: string) => void
  ): AsyncGenerator<{ event: string; path: string }> {
    const { watch } = await import('fs/promises');

    // Get initial file list
    const initialFiles = await glob(pattern);
    const fileSet = new Set(initialFiles);

    // Watch parent directory
    const baseDir = pattern.split('*')[0] || '.';
    const watcher = watch(baseDir, { recursive: true });

    for await (const event of watcher) {
      const fullPath = path.join(baseDir, event.filename!);

      // Check if file matches pattern
      const matches = await glob(pattern);
      const matchSet = new Set(matches);

      // Detect additions
      for (const file of matchSet) {
        if (!fileSet.has(file)) {
          fileSet.add(file);
          callback?.('add', file);
          yield { event: 'add', path: file };
        }
      }

      // Detect deletions
      for (const file of fileSet) {
        if (!matchSet.has(file)) {
          fileSet.delete(file);
          callback?.('delete', file);
          yield { event: 'delete', path: file };
        }
      }

      // Detect changes (files that still exist)
      if (matchSet.has(fullPath)) {
        callback?.('change', fullPath);
        yield { event: 'change', path: fullPath };
      }
    }
  }

  /**
   * Clean build artifacts and temporary files
   */
  static async cleanBuildArtifacts(rootDir: string): Promise<{
    deletedFiles: string[];
    deletedDirectories: string[];
    freedSpaceKB: number;
  }> {
    const patterns = [
      '**/dist/**',
      '**/build/**',
      '**/.cache/**',
      '**/node_modules/.cache/**',
      '**/*.log',
      '**/coverage/**',
      '**/.turbo/**',
    ];

    const deletedFiles: string[] = [];
    const deletedDirectories: string[] = [];
    let freedSpace = 0;

    for (const pattern of patterns) {
      try {
        const result = await this.scanDirectory(path.join(rootDir, pattern), {
          includeDirectories: true,
        });

        // Note: In production, you would actually delete these files
        // For safety, we're just collecting them here
        deletedFiles.push(...result.files);
        deletedDirectories.push(...result.directories);
        freedSpace += result.totalSize;
      } catch (error) {
        console.warn(`Failed to scan pattern ${pattern}:`, error);
      }
    }

    return {
      deletedFiles,
      deletedDirectories,
      freedSpaceKB: freedSpace / 1024,
    };
  }
}

/**
 * Example usage
 */
export async function demonstrateFileScanning() {
  // Scan for all TypeScript files
  const tsFiles = await FileScanner.findTypeScriptFiles('.');
  console.log(
    `Found ${tsFiles.fileCount} TypeScript files in ${tsFiles.directoryCount} directories`
  );

  // Get project structure
  const structure = await FileScanner.getProjectStructure('.');
  console.log('Project structure:', {
    sourceFiles: structure.sourceFiles.fileCount,
    testFiles: structure.testFiles.fileCount,
    configFiles: structure.configFiles.length,
    totalSizeMB: (structure.statistics.totalSizeKB / 1024).toFixed(2),
  });

  // Watch for changes (example)
  const watcher = FileScanner.watchFiles('src/**/*.ts', (event, path) => {
    console.log(`File ${event}: ${path}`);
  });

  // Process first 5 events
  let count = 0;
  for await (const event of watcher) {
    console.log('Watch event:', event);
    if (++count >= 5) break;
  }

  return structure;
}
