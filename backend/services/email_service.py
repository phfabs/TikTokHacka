import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from jinja2 import Template
from flask import current_app
from backend.services.cache_service import CacheService

class EmailService:
    """Service for sending email notifications and managing email templates"""
    
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@yizplanner.com')
        self.from_name = os.getenv('FROM_NAME', 'YiZ Planner')
        
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return all([
            self.smtp_server,
            self.smtp_username,
            self.smtp_password,
            self.from_email
        ])
    
    def send_email(self, to_email: str, subject: str, html_content: str, 
                   text_content: str = None, attachments: List[Dict] = None) -> bool:
        """Send an email"""
        
        if not self.is_configured():
            logging.warning("Email service not configured - skipping email send")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add text version
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            # Add HTML version
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    self._add_attachment(msg, attachment)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logging.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def _add_attachment(self, msg: MIMEMultipart, attachment: Dict):
        """Add attachment to email message"""
        try:
            filename = attachment['filename']
            content = attachment['content']
            mimetype = attachment.get('mimetype', 'application/octet-stream')
            
            part = MIMEBase(*mimetype.split('/', 1))
            part.set_payload(content)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {filename}'
            )
            msg.attach(part)
            
        except Exception as e:
            logging.error(f"Failed to add attachment {attachment.get('filename', 'unknown')}: {e}")
    
    def send_welcome_email(self, user_email: str, username: str) -> bool:
        """Send welcome email to new users"""
        
        subject = "Welcome to YiZ Planner! 🚀"
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to YiZ Planner</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 40px 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">Welcome to YiZ Planner!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your journey to skill mastery starts here</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #8B5CF6; margin-top: 0;">Hi {{ username }}! 👋</h2>
                    
                    <p>Welcome to the YiZ Planner community! We're excited to help you discover, learn, and master new skills.</p>
                    
                    <h3 style="color: #8B5CF6;">What you can do:</h3>
                    <ul style="padding-left: 20px;">
                        <li><strong>Discover Skills:</strong> Browse thousands of skill-learning plans shared by the community</li>
                        <li><strong>Share Knowledge:</strong> Create and share your own skill-learning plans</li>
                        <li><strong>Connect:</strong> Follow other learners and get inspired by their journey</li>
                        <li><strong>Track Progress:</strong> Use our tools to monitor your learning progress</li>
                        <li><strong>Engage:</strong> Like, comment, and contribute to the community</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{ app_url }}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Explore YiZ Planner</a>
                    </div>
                    
                    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
                        Need help getting started? Check out our <a href="{{ help_url }}" style="color: #8B5CF6;">Getting Started Guide</a> or reply to this email with any questions.
                    </p>
                    
                    <p style="color: #666; font-size: 14px;">
                        Happy learning!<br>
                        The YiZ Planner Team
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to YiZ Planner, {username}!
        
        We're excited to help you discover, learn, and master new skills.
        
        What you can do:
        - Discover Skills: Browse thousands of skill-learning plans
        - Share Knowledge: Create and share your own plans
        - Connect: Follow other learners and get inspired
        - Track Progress: Monitor your learning journey
        - Engage: Like, comment, and contribute to the community
        
        Visit YiZ Planner: {os.getenv('FRONTEND_URL', 'https://yizplanner.com')}
        
        Happy learning!
        The YiZ Planner Team
        """
        
        template = Template(html_template)
        html_content = template.render(
            username=username,
            app_url=os.getenv('FRONTEND_URL', 'https://yizplanner.com'),
            help_url=os.getenv('FRONTEND_URL', 'https://yizplanner.com') + '/help'
        )
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_notification_digest(self, user_email: str, username: str, 
                               notifications: List[Dict]) -> bool:
        """Send daily/weekly notification digest"""
        
        if not notifications:
            return True  # No notifications to send
        
        subject = f"Your YiZ Planner Updates ({len(notifications)} new notifications)"
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>YiZ Planner Updates</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 30px 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">Your YiZ Planner Updates</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">{{ notification_count }} new notifications</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #8B5CF6; margin-top: 0;">Hi {{ username }}! 👋</h2>
                    
                    <p>Here's what's been happening in your YiZ Planner community:</p>
                    
                    {% for notification in notifications %}
                    <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #8B5CF6;">
                        <div style="font-weight: bold; color: #8B5CF6;">{{ notification.type_display }}</div>
                        <div style="margin-top: 5px;">{{ notification.message }}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">{{ notification.time_ago }}</div>
                    </div>
                    {% endfor %}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{ app_url }}/notifications" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">View All Notifications</a>
                    </div>
                    
                    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
                        To manage your notification preferences, visit your <a href="{{ app_url }}/settings" style="color: #8B5CF6;">account settings</a>.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Format notifications for template
        formatted_notifications = []
        for notif in notifications:
            formatted_notifications.append({
                'type_display': self._format_notification_type(notif.get('notification_type', '')),
                'message': notif.get('data', {}).get('message', 'New notification'),
                'time_ago': self._format_time_ago(notif.get('created_at'))
            })
        
        template = Template(html_template)
        html_content = template.render(
            username=username,
            notifications=formatted_notifications,
            notification_count=len(notifications),
            app_url=os.getenv('FRONTEND_URL', 'https://yizplanner.com')
        )
        
        return self.send_email(user_email, subject, html_content)
    
    def send_skill_engagement_summary(self, user_email: str, username: str, 
                                    skill_stats: Dict) -> bool:
        """Send weekly skill engagement summary to skill creators"""
        
        subject = "Your YiZ Planner Skill Performance Summary 📊"
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 30px 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">📊 Your Skill Performance</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Weekly Summary</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #8B5CF6; margin-top: 0;">Hi {{ username }}! 👋</h2>
                    
                    <p>Here's how your shared skills performed this week:</p>
                    
                    <div style="display: flex; flex-wrap: wrap; margin: 20px 0;">
                        <div style="background: white; padding: 20px; margin: 10px; border-radius: 8px; flex: 1; min-width: 120px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #8B5CF6;">{{ skill_stats.total_views }}</div>
                            <div style="font-size: 14px; color: #666;">Total Views</div>
                        </div>
                        <div style="background: white; padding: 20px; margin: 10px; border-radius: 8px; flex: 1; min-width: 120px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #10B981;">{{ skill_stats.total_likes }}</div>
                            <div style="font-size: 14px; color: #666;">Total Likes</div>
                        </div>
                        <div style="background: white; padding: 20px; margin: 10px; border-radius: 8px; flex: 1; min-width: 120px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #F59E0B;">{{ skill_stats.total_downloads }}</div>
                            <div style="font-size: 14px; color: #666;">Downloads</div>
                        </div>
                    </div>
                    
                    {% if skill_stats.top_skills %}
                    <h3 style="color: #8B5CF6;">🏆 Your Top Performing Skills:</h3>
                    {% for skill in skill_stats.top_skills %}
                    <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #10B981;">
                        <div style="font-weight: bold;">{{ skill.title }}</div>
                        <div style="font-size: 14px; color: #666; margin-top: 5px;">
                            {{ skill.views }} views • {{ skill.likes }} likes • {{ skill.downloads }} downloads
                        </div>
                    </div>
                    {% endfor %}
                    {% endif %}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{ app_url }}/dashboard" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">View Full Analytics</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        Keep creating amazing content!<br>
                        The YiZ Planner Team
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(
            username=username,
            skill_stats=skill_stats,
            app_url=os.getenv('FRONTEND_URL', 'https://yizplanner.com')
        )
        
        return self.send_email(user_email, subject, html_content)
    
    def send_password_reset_email(self, user_email: str, reset_token: str) -> bool:
        """Send password reset email"""
        
        subject = "Reset Your YiZ Planner Password 🔐"
        reset_url = f"{os.getenv('FRONTEND_URL', 'https://yizplanner.com')}/reset-password?token={reset_token}"
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 30px 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">🔐 Password Reset Request</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>We received a request to reset your YiZ Planner password.</p>
                    
                    <p>Click the button below to create a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{ reset_url }}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 24 hours for security reasons.
                    </p>
                    
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this password reset, you can safely ignore this email.
                    </p>
                    
                    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{{ reset_url }}" style="color: #8B5CF6; word-break: break-all;">{{ reset_url }}</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(reset_url=reset_url)
        
        text_content = f"""
        Password Reset Request
        
        We received a request to reset your YiZ Planner password.
        
        Click this link to create a new password:
        {reset_url}
        
        This link will expire in 24 hours for security reasons.
        
        If you didn't request this password reset, you can safely ignore this email.
        """
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_email_verification(self, user_email: str, verification_token: str) -> bool:
        """Send email verification"""
        
        subject = "Verify Your YiZ Planner Email ✉️"
        verification_url = f"{os.getenv('FRONTEND_URL', 'https://yizplanner.com')}/verify-email?token={verification_token}"
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 30px 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">✉️ Verify Your Email</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Please verify your email address to complete your YiZ Planner account setup.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{ verification_url }}" style="background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Verify Email</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        This verification link will expire in 24 hours.
                    </p>
                    
                    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{{ verification_url }}" style="color: #8B5CF6; word-break: break-all;">{{ verification_url }}</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(verification_url=verification_url)
        
        return self.send_email(user_email, subject, html_content)
    
    def _format_notification_type(self, notification_type: str) -> str:
        """Format notification type for display"""
        type_mapping = {
            'like_received': '❤️ Like Received',
            'comment_received': '💬 New Comment',
            'comment_reply': '↩️ Comment Reply',
            'skill_downloaded': '⬇️ Skill Downloaded',
            'custom_task_added': '➕ Custom Task Added',
            'task_voted': '👍 Task Voted',
            'follower_added': '👥 New Follower',
            'skill_rated': '⭐ Skill Rated'
        }
        return type_mapping.get(notification_type, '📢 Notification')
    
    def _format_time_ago(self, created_at) -> str:
        """Format time ago string"""
        if not created_at:
            return "Recently"
        
        try:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            now = datetime.utcnow()
            diff = now - created_at
            
            if diff.days > 0:
                return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                return f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                minutes = diff.seconds // 60
                return f"{minutes} minute{'s' if minutes > 1 else ''} ago" if minutes > 0 else "Just now"
        except:
            return "Recently"
    
    def test_email_connection(self) -> Dict[str, Any]:
        """Test email service connection"""
        if not self.is_configured():
            return {
                "success": False,
                "message": "Email service not configured"
            }
        
        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
            
            return {
                "success": True,
                "message": "Email service connection successful"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Email service connection failed: {str(e)}"
            }

# Global email service instance
email_service = EmailService()