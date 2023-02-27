const { mnt: { baseFolderPath } } = require('../../infrastructure/config');
const { PROCESSING, FINISHED } = require('../../domain/transcript/status-list');

class TranscriptStream {
  constructor({ fileSystem, spawn, process, transcriptRepository }) {
    this.fileSystem = fileSystem;
    this.spawn = spawn;
    this.process = process;
    this.transcriptRepository = transcriptRepository;
  }

  async execute({ streamId }) {
    const streamTranscript = await this.transcriptRepository.findByStreamId(streamId);
    streamTranscript.status = PROCESSING;
    this.transcriptRepository.update(streamTranscript);

    const path = this._createFolder({ basePath: baseFolderPath, folderName: streamId });
    await this._downloadTwitchVod({ streamId, path });
    await this._convertFiles({ streamId, path });
    this.fileSystem.unlinkSync(`${path}/${streamId}.mkv`);
    if (streamTranscript.duration > 1800) {
      await this._splitFiles({ streamId, path, secondsToSplit: 1800 });
      this.fileSystem.unlinkSync(`${path}/${streamId}.mp3`);
    }

    await this._runTranscription({ path: `${path}/` });
    const transcriptionJSON = JSON.parse(this.fileSystem.readFileSync(`${path}/transcript.json`));
    streamTranscript.transcriptions = [...transcriptionJSON.segments]
    streamTranscript.status = FINISHED;
    this.transcriptRepository.update(streamTranscript);

    this.fileSystem.rmSync(path, { recursive: true });
  }

  async _runTranscription({ path }) {
    return await this._commandRunner('python3', './lib/gladia-0.0.1.py', path);
  }

  async _splitFiles({ streamId, path, secondsToSplit }) {
    await this._commandRunner('ffmpeg', '-i', `${path}/${streamId}.mp3`, '-f', 'segment', '-segment_time', parseInt(secondsToSplit), `${path}/out%03d.mp3`);
  }

  async _downloadTwitchVod({ streamId, path }) {
    await this._commandRunner('python3', './lib/twitch-dl.2.1.1.pyz', 'download', '-q', 'audio_only', streamId, '--output', `${path}/{id}.{format}`);
  }

  async _convertFiles({ streamId, path }) {
    await this._commandRunner('ffmpeg', '-i', `${path}/${streamId}.mkv`, '-acodec', 'libmp3lame', '-ac', '2', '-ab', '64k', '-ar', '44100', `${path}/${streamId}.mp3`);
  }

  _createFolder({ basePath, folderName }) {
    const folderExists = this.fileSystem.existsSync(`${basePath}/${folderName}`);

    if (folderExists) {
      this.fileSystem.rmSync(`${basePath}/${folderName}`, { recursive: true });
    }

    this.fileSystem.mkdirSync(`${basePath}/${folderName}`);
    return `${basePath}/${folderName}`;
  }

  _commandRunner(...command) {
    let processRunner = this.spawn(command[0], command.slice(1));
    return new Promise((resolveFunc) => {
      const outProcess = []
      processRunner.stdout.on("data", (out) => {
        let str = out.toString();
        if (str.endsWith('\n')) {
          str = str.substring(0, str.length - 1);
        }
        outProcess.push(str)
        this.process.stdout.write(out.toString());
      });

      processRunner.stderr.on("data", (out) => {
        console.log(out.toString())
        this.process.stderr.write(out.toString());
      });

      processRunner.on("exit", (code) => {
        resolveFunc({ code, outProcess });
      });
    });
  }
}

module.exports = TranscriptStream