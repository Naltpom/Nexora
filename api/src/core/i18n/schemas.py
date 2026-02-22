"""i18n Pydantic schemas."""

from pydantic import BaseModel


class LocaleInfo(BaseModel):
    code: str
    label: str
    is_default: bool


class TranslationsResponse(BaseModel):
    locale: str
    namespace: str
    translations: dict[str, str]
