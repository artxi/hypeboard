import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

interface AudioEditorProps {
  audioFile?: File;
  audioUrl?: string;
  onTrimChange?: (startTime: number, endTime: number, duration: number) => void;
  initialStartTime?: number;
  initialEndTime?: number;
}

export const AudioEditor: React.FC<AudioEditorProps> = ({
  audioFile,
  audioUrl,
  onTrimChange,
  initialStartTime = 0,
  initialEndTime,
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);
  const activeRegionRef = useRef<any>(null);
  const onTrimChangeRef = useRef(onTrimChange);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState<number | null>(initialEndTime || null);
  const [duration, setDuration] = useState<number | null>(null);

  // Keep the callback ref up to date
  useEffect(() => {
    onTrimChangeRef.current = onTrimChange;
  }, [onTrimChange]);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Create regions plugin
    const regions = RegionsPlugin.create();
    regionsPluginRef.current = regions;

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#ddd',
      progressColor: '#4a90e2',
      cursorColor: '#333',
      barWidth: 2,
      barGap: 1,
      height: 80,
      plugins: [regions],
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      wavesurfer.load(url);
    } else if (audioUrl) {
      wavesurfer.load(audioUrl);
    }

    // Event listeners
    wavesurfer.on('ready', () => {
      const audioDuration = wavesurfer.getDuration();
      setDuration(audioDuration);

      // Clear any existing regions first
      const existingRegions = regions.getRegions();
      existingRegions.forEach((r: any) => r.remove());

      // Add initial region
      const regionEnd = initialEndTime || audioDuration;
      setEndTime(regionEnd);

      const region = regions.addRegion({
        start: initialStartTime,
        end: regionEnd,
        color: 'rgba(74, 144, 226, 0.3)',
        drag: true,
        resize: true,
      });

      // Store region reference
      activeRegionRef.current = region;

      // Call onTrimChange with initial values
      if (onTrimChangeRef.current) {
        onTrimChangeRef.current(initialStartTime, regionEnd, audioDuration);
      }

      // Listen to region update events during and after dragging
      const updateHandler = () => {
        const newStart = region.start;
        const newEnd = region.end;
        setStartTime(newStart);
        setEndTime(newEnd);
        if (onTrimChangeRef.current) {
          onTrimChangeRef.current(newStart, newEnd, audioDuration);
        }
      };

      // Listen to both 'update' (during drag) and 'update-end' (after drag)
      region.on('update', updateHandler);
      region.on('update-end', updateHandler);
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));

    return () => {
      wavesurfer.destroy();
    };
  }, [audioFile, audioUrl, initialStartTime, initialEndTime]);

  const handlePlayPause = () => {
    if (wavesurferRef.current && activeRegionRef.current) {
      const region = activeRegionRef.current;

      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        // Play only the trimmed region
        wavesurferRef.current.setTime(region.start);
        wavesurferRef.current.play();

        // Stop at region end
        const checkTime = setInterval(() => {
          if (wavesurferRef.current) {
            const currentTime = wavesurferRef.current.getCurrentTime();
            if (currentTime >= region.end) {
              wavesurferRef.current.pause();
              wavesurferRef.current.setTime(region.start);
              clearInterval(checkTime);
            }
          }
        }, 50);
      }
    } else if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '0:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const trimmedDuration = endTime !== null ? endTime - startTime : 0;

  return (
    <div className="audio-editor">
      <div className="waveform" ref={waveformRef}></div>

      <div className="audio-controls">
        <button
          className="play-pause-button"
          onClick={handlePlayPause}
          type="button"
        >
          {isPlaying ? '⏸ Pause' : '▶ Preview'}
        </button>

        <div className="time-info">
          {duration !== null && endTime !== null && (
            <div className="duration-display-compact">
              <span className="duration-label">Duration: {formatTime(trimmedDuration)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
