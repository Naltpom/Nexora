class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str = "An error occurred"):
        self.message = message
        super().__init__(self.message)


class EntityNotFoundError(AppError):
    def __init__(self, entity_name: str, entity_id=None):
        msg = f"{entity_name} not found"
        if entity_id is not None:
            msg = f"{entity_name} with id '{entity_id}' not found"
        super().__init__(msg)


class ValidationError(AppError):
    pass


class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message)


class AuthorizationError(AppError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message)


class DuplicateEntityError(AppError):
    def __init__(self, entity_name: str, field: str = ""):
        msg = f"{entity_name} already exists"
        if field:
            msg = f"{entity_name} with this {field} already exists"
        super().__init__(msg)
