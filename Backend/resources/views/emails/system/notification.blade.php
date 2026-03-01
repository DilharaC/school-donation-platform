@component('mail::message')
# {{ $payload['title'] ?? 'Notification' }}

{{ $payload['message'] ?? '' }}

@isset($payload['amount'])
**Amount:** LKR {{ number_format((float)$payload['amount']) }}
@endisset

@isset($payload['school_name'])
**School:** {{ $payload['school_name'] }}
@endisset

@isset($payload['request_title'])
**Request:** {{ $payload['request_title'] }}
@endisset

@isset($payload['status'])
**Status:** {{ $payload['status'] }}
@endisset

@isset($payload['created_at'])
**Date:** {{ $payload['created_at'] }}
@endisset

Thanks,<br>

@endcomponent