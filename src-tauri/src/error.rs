use serde::Serialize;
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcError {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

impl IpcError {
    pub fn new(code: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            details: None,
        }
    }

    pub fn with_details(code: impl Into<String>, details: Value) -> Self {
        Self {
            code: code.into(),
            details: Some(details),
        }
    }

    pub fn with_str_detail(code: impl Into<String>, key: &str, value: impl Into<String>) -> Self {
        Self::with_details(code, json!({ key: value.into() }))
    }
}

impl std::fmt::Display for IpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match serde_json::to_string(self) {
            Ok(s) => write!(f, "{s}"),
            Err(_) => write!(f, "{{\"code\":\"unknown\"}}"),
        }
    }
}

impl From<IpcError> for String {
    fn from(value: IpcError) -> Self {
        value.to_string()
    }
}

pub type IpcResult<T> = Result<T, IpcError>;
