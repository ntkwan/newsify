{{/* Generate basic labels */}}
{{- define "newsify.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
generate a fullname for the release
*/}}
{{- define "newsify.fullname" -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/*
return the name of the app (release)
*/}}
{{- define "newsify.name" -}}
{{ .Release.Name }}
{{- end }} 