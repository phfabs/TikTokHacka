from marshmallow import Schema, fields, validate, EXCLUDE

class SkillCreateSchema(Schema):
    skill_name = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    difficulty = fields.Str(validate=validate.OneOf(["beginner", "intermediate", "advanced"]))
    custom_duration = fields.Int(validate=validate.Range(min=7, max=90))

class HabitCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    category = fields.Str(required=True, validate=validate.OneOf(["health", "productivity", "learning", "creative", "social"]))
    target_days = fields.List(fields.Int(validate=validate.Range(min=0, max=6)))
    target_streak = fields.Int(validate=validate.Range(min=1))
    color = fields.Str(validate=validate.Regexp(r'^#[0-9A-Fa-f]{6}$'))
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    reminder_time = fields.Time(required=False, allow_none=True)
    custom_days = fields.List(fields.Int(validate=validate.Range(min=0, max=6)), required=False, allow_none=True)
    reminder_message = fields.Str(required=False, allow_none=True)

class HabitCheckinSchema(Schema):
    completion_date = fields.Date()
    quality_rating = fields.Int(validate=validate.Range(min=1, max=5))
    notes = fields.Str(validate=validate.Length(max=500))
    duration_actual = fields.Int(validate=validate.Range(min=1))

class CheckinCreateSchema(Schema):
    date = fields.Date(required=True)
    completed = fields.Bool(required=True)
    notes = fields.Str(required=False, allow_none=True)

    class Meta:
        unknown = EXCLUDE 

class SkillUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=3, max=100))
    skill_name = fields.Str(validate=validate.Length(min=3, max=100))
    difficulty = fields.Str(validate=validate.OneOf(["beginner", "intermediate", "advanced"]))
    custom_duration = fields.Int(validate=validate.Range(min=7, max=90))

    class Meta:
        unknown = EXCLUDE

class HabitUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=3, max=100))
    category = fields.Str(validate=validate.OneOf(["health", "productivity", "learning", "creative", "social"]))
    target_days = fields.List(fields.Int(validate=validate.Range(min=0, max=6)))
    target_streak = fields.Int(validate=validate.Range(min=1))
    color = fields.Str(validate=validate.Regexp(r'^#[0-9A-Fa-f]{6}$'))
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    reminder_time = fields.Time(allow_none=True)
    custom_days = fields.List(fields.Int(validate=validate.Range(min=0, max=6)), allow_none=True)
    reminder_message = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE 