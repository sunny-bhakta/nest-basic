import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { 
  LifecycleEventWithMetadata, 
  AuthenticationEvent,
  AuthorizationEvent,
  SecurityEvent,
  ErrorEvent,
  ValidationEvent,
  RateLimitEvent 
} from '../lifecycle-events.interface';
import { LIFECYCLE_EVENTS } from '../lifecycle-events.interface';

interface SecurityIncident {
  id: string;
  timestamp: Date;
  type: 'auth_failure' | 'authz_denial' | 'attack_detected' | 'rate_limit' | 'validation_attack' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip?: string;
  userAgent?: string;
  userId?: string;
  requestId: string;
  details: Record<string, any>;
  resolved: boolean;
  actions: string[];
}

interface ThreatIntelligence {
  ip: string;
  riskScore: number; // 0-100
  firstSeen: Date;
  lastSeen: Date;
  incidents: number;
  behaviors: string[];
  blocked: boolean;
  reason?: string;
}

/**
 * Security monitoring listener that tracks threats and suspicious activities
 * Provides real-time security alerting and threat intelligence
 */
@Injectable()
export class SecurityEventListener {
  private readonly logger = new Logger(SecurityEventListener.name);
  private readonly incidents = new Map<string, SecurityIncident>();
  private readonly threatIntel = new Map<string, ThreatIntelligence>();
  
  // Security counters per IP
  private readonly ipSecurityCounters = new Map<string, {
    authFailures: number;
    authzDenials: number;
    validationFailures: number;
    rateLimitHits: number;
    lastActivity: Date;
    riskScore: number;
  }>();

  // Pattern detection
  private readonly suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|update|exec|script)\b/i,
    /[<>'"();]/,
    /\.\.\//,
    /\/etc\/passwd/i,
    /\/proc\//i,
    /cmd\.exe/i,
    /powershell/i,
  ];

  // Known malicious user agents
  private readonly maliciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
  ];

  // Rate limiting thresholds for security events
  private readonly securityThresholds = {
    authFailuresPerHour: 10,
    authzDenialsPerHour: 20,
    validationFailuresPerHour: 50,
    rateLimitHitsPerHour: 5,
    highRiskScore: 70,
    criticalRiskScore: 90,
  };

  @OnEvent(LIFECYCLE_EVENTS.AUTH_FAILURE)
  handleAuthFailure(payload: LifecycleEventWithMetadata<AuthenticationEvent>): void {
    const { event } = payload;
    
    this.updateSecurityCounters(event.ip, 'authFailures');
    this.analyzeUserAgent(event.userAgent, event.ip, event.requestId);
    
    // Check for brute force patterns
    if (this.detectBruteForce(event.ip)) {
      this.createSecurityIncident({
        type: 'auth_failure',
        severity: 'high',
        ip: event.ip,
        userAgent: event.userAgent,
        requestId: event.requestId,
        details: {
          reason: event.reason,
          method: event.method,
          pattern: 'brute_force_detected',
        },
      });
    }

    this.updateThreatIntelligence(event.ip, 'auth_failure');
    this.logger.warn(
      `🔐 Auth failure tracked for IP: ${event.ip} - Total failures: ${this.getSecurityCounter(event.ip, 'authFailures')}`
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTHZ_DENIED)
  handleAuthzDenied(payload: LifecycleEventWithMetadata<AuthorizationEvent>): void {
    const { event } = payload;
    
    this.updateSecurityCounters(event.ip, 'authzDenials');
    
    // Check for privilege escalation attempts
    if (this.detectPrivilegeEscalation(event)) {
      this.createSecurityIncident({
        type: 'authz_denial',
        severity: 'medium',
        ip: event.ip,
        userId: event.userId,
        requestId: event.requestId,
        details: {
          resource: event.resource,
          permission: event.permission,
          accessLevel: event.accessLevel,
          reason: event.reason,
          pattern: 'privilege_escalation_attempt',
        },
      });
    }

    this.updateThreatIntelligence(event.ip, 'privilege_escalation');
  }

  @OnEvent(LIFECYCLE_EVENTS.VALIDATION_FAILURE)
  handleValidationFailure(payload: LifecycleEventWithMetadata<ValidationEvent>): void {
    const { event } = payload;
    
    this.updateSecurityCounters(event.ip, 'validationFailures');
    
    // Check for injection attacks in validation errors
    const hasInjectionPattern = event.errors?.some(error => 
      this.suspiciousPatterns.some(pattern => pattern.test(error))
    );

    if (hasInjectionPattern) {
      this.createSecurityIncident({
        type: 'validation_attack',
        severity: 'high',
        ip: event.ip,
        requestId: event.requestId,
        details: {
          target: event.target,
          validatorType: event.validatorType,
          errors: event.errors,
          pattern: 'injection_attempt',
        },
      });
    }

    this.updateThreatIntelligence(event.ip, 'injection_attempt');
  }

  @OnEvent(LIFECYCLE_EVENTS.SECURITY_ATTACK_DETECTED)
  handleAttackDetected(payload: LifecycleEventWithMetadata<SecurityEvent>): void {
    const { event } = payload;
    
    this.createSecurityIncident({
      type: 'attack_detected',
      severity: event.severity,
      ip: event.ip,
      userAgent: event.userAgent,
      requestId: event.requestId,
      details: {
        attackType: event.details.attackType,
        pattern: event.details.pattern,
        blocked: event.details.blocked,
        action: event.action,
      },
    });

    this.updateThreatIntelligence(event.ip, event.details.attackType || 'generic_attack');
    
    this.logger.error(
      `🚨 SECURITY ATTACK [${event.requestId}] Type: ${event.details.attackType} from ${event.ip} - Action: ${event.action}`
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY)
  handleSuspiciousActivity(payload: LifecycleEventWithMetadata<SecurityEvent>): void {
    const { event } = payload;
    
    this.createSecurityIncident({
      type: 'suspicious_pattern',
      severity: event.severity,
      ip: event.ip,
      requestId: event.requestId,
      details: event.details,
    });

    this.updateThreatIntelligence(event.ip, 'suspicious_activity');
  }

  @OnEvent(LIFECYCLE_EVENTS.RATE_LIMIT_THROTTLED)
  handleRateLimitThrottled(payload: LifecycleEventWithMetadata<RateLimitEvent>): void {
    const { event } = payload;
    
    this.updateSecurityCounters(event.ip, 'rateLimitHits');
    
    // Multiple rate limit hits could indicate abuse
    const counter = this.getSecurityCounter(event.ip, 'rateLimitHits');
    if (counter > this.securityThresholds.rateLimitHitsPerHour) {
      this.createSecurityIncident({
        type: 'rate_limit',
        severity: 'medium',
        ip: event.ip,
        requestId: event.requestId,
        details: {
          limit: event.limit,
          current: event.current,
          key: event.key,
          totalHits: counter,
        },
      });
    }

    this.updateThreatIntelligence(event.ip, 'rate_limit_abuse');
  }

  @OnEvent(LIFECYCLE_EVENTS.ERROR_OCCURRED)
  handleErrorOccurred(payload: LifecycleEventWithMetadata<ErrorEvent>): void {
    const { event } = payload;
    
    // Look for error patterns that might indicate attacks
    const errorMessage = event.error.message.toLowerCase();
    const suspiciousErrorPatterns = [
      'sql syntax',
      'mysql_fetch',
      'ora-',
      'microsoft jet database',
      'access denied for user',
      'failed to connect to',
      'directory traversal',
      'file not found',
      'permission denied',
    ];

    if (suspiciousErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
      this.createSecurityIncident({
        type: 'suspicious_pattern',
        severity: 'low',
        ip: event.ip,
        requestId: event.requestId,
        details: {
          errorType: event.error.name,
          errorMessage: event.error.message,
          phase: event.phase,
          pattern: 'suspicious_error_pattern',
        },
      });
    }
  }

  /**
   * Get security dashboard summary
   */
  getSecuritySummary(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    const recentIncidents = Array.from(this.incidents.values())
      .filter(incident => incident.timestamp > oneHourAgo);
    
    const dailyIncidents = Array.from(this.incidents.values())
      .filter(incident => incident.timestamp > oneDayAgo);

    const highRiskIPs = Array.from(this.threatIntel.values())
      .filter(intel => intel.riskScore >= this.securityThresholds.highRiskScore);

    const criticalRiskIPs = Array.from(this.threatIntel.values())
      .filter(intel => intel.riskScore >= this.securityThresholds.criticalRiskScore);

    return {
      overview: {
        totalIncidents: this.incidents.size,
        recentIncidents: recentIncidents.length,
        dailyIncidents: dailyIncidents.length,
        unresolvedIncidents: Array.from(this.incidents.values()).filter(i => !i.resolved).length,
        highRiskIPs: highRiskIPs.length,
        criticalRiskIPs: criticalRiskIPs.length,
        blockedIPs: Array.from(this.threatIntel.values()).filter(i => i.blocked).length,
      },
      incidentsByType: this.getIncidentsByType(recentIncidents),
      incidentsBySeverity: this.getIncidentsBySeverity(recentIncidents),
      topThreatIPs: this.getTopThreatIPs(10),
      recentCriticalIncidents: Array.from(this.incidents.values())
        .filter(i => i.severity === 'critical' && i.timestamp > oneDayAgo)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10),
    };
  }

  /**
   * Get threat intelligence for specific IP
   */
  getThreatIntelligence(ip: string): ThreatIntelligence | null {
    return this.threatIntel.get(ip) || null;
  }

  /**
   * Get all security incidents for specific IP
   */
  getIncidentsForIP(ip: string): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .filter(incident => incident.ip === ip)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Mark incident as resolved
   */
  resolveIncident(incidentId: string, resolvedBy: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.resolved = true;
      incident.actions.push(`Resolved by ${resolvedBy} at ${new Date().toISOString()}`);
      return true;
    }
    return false;
  }

  /**
   * Block IP address
   */
  blockIP(ip: string, reason: string, blockedBy: string): void {
    const intel = this.threatIntel.get(ip);
    if (intel) {
      intel.blocked = true;
      intel.reason = reason;
    } else {
      this.threatIntel.set(ip, {
        ip,
        riskScore: 100,
        firstSeen: new Date(),
        lastSeen: new Date(),
        incidents: 0,
        behaviors: [],
        blocked: true,
        reason,
      });
    }

    this.logger.warn(`🚫 IP ${ip} blocked by ${blockedBy}: ${reason}`);
  }

  /**
   * Clear old incidents and threat intelligence
   */
  cleanup(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
    
    // Remove old incidents
    for (const [id, incident] of this.incidents.entries()) {
      if (incident.timestamp < thirtyDaysAgo && incident.resolved) {
        this.incidents.delete(id);
      }
    }

    // Remove old threat intelligence
    for (const [ip, intel] of this.threatIntel.entries()) {
      if (intel.lastSeen < thirtyDaysAgo && !intel.blocked) {
        this.threatIntel.delete(ip);
      }
    }

    // Clear old security counters
    for (const [ip, counters] of this.ipSecurityCounters.entries()) {
      if (counters.lastActivity < thirtyDaysAgo) {
        this.ipSecurityCounters.delete(ip);
      }
    }

    this.logger.debug('Security data cleanup completed');
  }

  private createSecurityIncident(incident: Omit<SecurityIncident, 'id' | 'timestamp' | 'resolved' | 'actions'>): void {
    const id = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullIncident: SecurityIncident = {
      ...incident,
      id,
      timestamp: new Date(),
      resolved: false,
      actions: [`Created: ${new Date().toISOString()}`],
    };

    this.incidents.set(id, fullIncident);
    
    this.logger.warn(
      `🚨 Security incident created: ${id} - Type: ${incident.type} - Severity: ${incident.severity}`
    );
  }

  private updateSecurityCounters(ip?: string, type?: string): void {
    if (!ip || !type) return;

    const counter = this.ipSecurityCounters.get(ip) || {
      authFailures: 0,
      authzDenials: 0,
      validationFailures: 0,
      rateLimitHits: 0,
      lastActivity: new Date(),
      riskScore: 0,
    };

    counter[type as keyof typeof counter]++;
    counter.lastActivity = new Date();
    counter.riskScore = this.calculateRiskScore(counter);
    
    this.ipSecurityCounters.set(ip, counter);
  }

  private getSecurityCounter(ip?: string, type?: string): number {
    if (!ip || !type) return 0;
    const counter = this.ipSecurityCounters.get(ip);
    if (!counter) return 0;
    
    const value = counter[type as keyof typeof counter];
    return typeof value === 'number' ? value : 0;
  }

  private calculateRiskScore(counters: any): number {
    let score = 0;
    score += counters.authFailures * 10;
    score += counters.authzDenials * 5;
    score += counters.validationFailures * 2;
    score += counters.rateLimitHits * 15;
    
    return Math.min(score, 100);
  }

  private detectBruteForce(ip?: string): boolean {
    if (!ip) return false;
    const failures = this.getSecurityCounter(ip, 'authFailures');
    return failures >= this.securityThresholds.authFailuresPerHour;
  }

  private detectPrivilegeEscalation(event: AuthorizationEvent): boolean {
    // Simple heuristic: multiple authorization denials for admin resources
    const denials = this.getSecurityCounter(event.ip, 'authzDenials');
    const isAdminResource = event.resource?.toLowerCase().includes('admin') || 
                           event.accessLevel?.toLowerCase().includes('admin') || false;
    
    return denials >= 5 && isAdminResource;
  }

  private analyzeUserAgent(userAgent?: string, ip?: string, requestId?: string): void {
    if (!userAgent || !ip) return;

    const isMalicious = this.maliciousUserAgents.some(pattern => pattern.test(userAgent));
    
    if (isMalicious) {
      this.createSecurityIncident({
        type: 'suspicious_pattern',
        severity: 'high',
        ip,
        userAgent,
        requestId: requestId || 'unknown',
        details: {
          pattern: 'malicious_user_agent',
          userAgent,
        },
      });
    }
  }

  private updateThreatIntelligence(ip?: string, behavior?: string): void {
    if (!ip || !behavior) return;

    const intel = this.threatIntel.get(ip) || {
      ip,
      riskScore: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
      incidents: 0,
      behaviors: [],
      blocked: false,
    };

    intel.lastSeen = new Date();
    intel.incidents++;
    
    if (!intel.behaviors.includes(behavior)) {
      intel.behaviors.push(behavior);
    }

    // Increase risk score based on behavior
    const riskIncrement = {
      'auth_failure': 5,
      'privilege_escalation': 10,
      'injection_attempt': 15,
      'generic_attack': 20,
      'suspicious_activity': 3,
      'rate_limit_abuse': 7,
    }[behavior] || 1;

    intel.riskScore = Math.min(intel.riskScore + riskIncrement, 100);
    
    this.threatIntel.set(ip, intel);
  }

  private getIncidentsByType(incidents: SecurityIncident[]): Record<string, number> {
    return incidents.reduce((acc, incident) => {
      acc[incident.type] = (acc[incident.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getIncidentsBySeverity(incidents: SecurityIncident[]): Record<string, number> {
    return incidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getTopThreatIPs(limit: number): Array<{ ip: string; riskScore: number; incidents: number; behaviors: string[] }> {
    return Array.from(this.threatIntel.values())
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit)
      .map(intel => ({
        ip: intel.ip,
        riskScore: intel.riskScore,
        incidents: intel.incidents,
        behaviors: intel.behaviors,
      }));
  }
}