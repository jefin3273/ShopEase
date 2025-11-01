/**
 * Custom Analytics Tracking Service
 * Replaces PostHog with our own implementation
 */

const UserEvent = require('../models/UserEvent');
const SessionRecording = require('../models/SessionRecording');
const { v4: uuidv4 } = require('uuid');

class AnalyticsService {
  /**
   * Capture a user event
   */
  async captureEvent(userId, sessionId, eventData) {
    try {
      // ensure a sessionId exists (some callers may pass null). Generate one if missing.
      const sid = sessionId || eventData.sessionId || uuidv4();
      const event = new UserEvent({
        userId,
        sessionId: sid,
        ...eventData,
        timestamp: new Date(),
      });
      
      await event.save();
      
      // Emit to Socket.IO for real-time updates (if available)
      if (global.io) {
        global.io.to(`project-${eventData.projectId || 'default'}`).emit('event', {
          type: 'user_event',
          data: event,
        });
      }
      
      return event;
    } catch (error) {
      console.error('Failed to capture event:', error);
      return null;
    }
  }

  /**
   * Capture recording event (cursor movement, click, etc.)
   */
  async captureRecordingEvent(sessionId, eventData) {
    try {
      let recording = await SessionRecording.findOne({ sessionId });
      
      if (!recording) {
        recording = new SessionRecording({
          sessionId,
          userId: eventData.userId,
          projectId: eventData.projectId || 'default',
          startTime: new Date(),
          device: eventData.device,
          entryURL: eventData.pageURL,
          events: [],
          stats: {
            totalEvents: 0,
            totalClicks: 0,
            totalScrolls: 0,
            totalMoves: 0,
          },
        });
      }
      
      // Add event to recording
      recording.events.push({
        type: eventData.type,
        timestamp: eventData.timestamp,
        data: eventData.data,
      });
      
      // Update stats
      recording.stats.totalEvents = (recording.stats.totalEvents || 0) + 1;
      if (eventData.type === 'click') recording.stats.totalClicks = (recording.stats.totalClicks || 0) + 1;
      if (eventData.type === 'scroll') recording.stats.totalScrolls = (recording.stats.totalScrolls || 0) + 1;
      if (eventData.type === 'mousemove') recording.stats.totalMoves = (recording.stats.totalMoves || 0) + 1;
      
      recording.exitURL = eventData.pageURL;
      recording.endTime = new Date();
      recording.duration = Math.floor((recording.endTime - recording.startTime) / 1000);
      
      await recording.save();
      
      // Emit to Socket.IO for real-time recording view
      if (global.io) {
        global.io.to(`recording-${sessionId}`).emit('recording_event', {
          sessionId,
          event: eventData,
        });
      }
      
      return recording;
    } catch (error) {
      console.error('Failed to capture recording event:', error);
      return null;
    }
  }

  /**
   * Add DOM snapshot to recording
   */
  async addSnapshot(sessionId, snapshot) {
    try {
      const recording = await SessionRecording.findOne({ sessionId });
      if (!recording) return null;
      
      recording.snapshots.push(snapshot);
      await recording.save();
      
      return recording;
    } catch (error) {
      console.error('Failed to add snapshot:', error);
      return null;
    }
  }

  /**
   * Add console log to recording
   */
  async addConsoleLog(sessionId, log) {
    try {
      const recording = await SessionRecording.findOne({ sessionId });
      if (!recording) return null;
      
      recording.consoleLogs.push(log);
      if (log.level === 'error') {
        recording.hasErrors = true;
      }
      
      await recording.save();
      return recording;
    } catch (error) {
      console.error('Failed to add console log:', error);
      return null;
    }
  }

  /**
   * Track user identification
   */
  async identifyUser(userId, properties) {
    try {
      await this.captureEvent(userId, null, {
        eventType: 'identify',
        eventName: 'User Identified',
        superProperties: properties,
      });
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Set super properties for a user
   */
  async setSuperProperties(userId, properties) {
    try {
      // Update all future events for this user with these properties
      // Store in a UserProperties model or cache
      console.log(`Setting super properties for user ${userId}:`, properties);
    } catch (error) {
      console.error('Failed to set super properties:', error);
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(projectId, from, to) {
    try {
      const query = { projectId };
      if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
      }
      
      const stats = await UserEvent.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
      ]);
      
      return stats.map(s => ({
        eventType: s._id,
        count: s.count,
        uniqueUsers: s.uniqueUsers.length,
      }));
    } catch (error) {
      console.error('Failed to get event stats:', error);
      return [];
    }
  }

  /**
   * Get heatmap data
   */
  async getHeatmapData(projectId, pageURL, eventType = 'click') {
    try {
      const events = await UserEvent.find({
        projectId,
        pageURL,
        eventType,
        'metadata.x': { $exists: true },
        'metadata.y': { $exists: true },
        'metadata.vw': { $exists: true },
        'metadata.vh': { $exists: true },
      }).select('metadata.x metadata.y metadata.vw metadata.vh timestamp');
      
      return events.map(e => ({
        x: e.metadata.x,
        y: e.metadata.y,
        vw: e.metadata.vw,
        vh: e.metadata.vh,
        timestamp: e.timestamp,
      }));
    } catch (error) {
      console.error('Failed to get heatmap data:', error);
      return [];
    }
  }

  /**
   * Get session replay data
   */
  async getSessionRecording(sessionId) {
    try {
      return await SessionRecording.findOne({ sessionId });
    } catch (error) {
      console.error('Failed to get session recording:', error);
      return null;
    }
  }

  /**
   * List session recordings
   */
  async listRecordings(projectId, options = {}) {
    try {
      const query = { projectId };
      if (options.hasErrors) query.hasErrors = true;
      if (options.userId) query.userId = options.userId;
      
      return await SessionRecording.find(query)
        .sort({ startTime: -1 })
        .limit(options.limit || 50)
        .select('sessionId userId startTime duration stats device entryURL hasErrors');
    } catch (error) {
      console.error('Failed to list recordings:', error);
      return [];
    }
  }
}

module.exports = new AnalyticsService();
