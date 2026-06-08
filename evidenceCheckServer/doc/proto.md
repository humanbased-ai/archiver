# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [evidence-checker.proto](#evidence-checker-proto)
    - [EvidenceCheckReq](#evidence_checker-EvidenceCheckReq)
    - [EvidenceCheckResp](#evidence_checker-EvidenceCheckResp)
    - [HealthCheckRequest](#evidence_checker-HealthCheckRequest)
    - [HealthCheckResponse](#evidence_checker-HealthCheckResponse)
    - [Submission](#evidence_checker-Submission)
    - [SubmissionCheckResult](#evidence_checker-SubmissionCheckResult)
  
    - [EvidenceCheckResp.Status](#evidence_checker-EvidenceCheckResp-Status)
    - [SubmissionCheckResult.Status](#evidence_checker-SubmissionCheckResult-Status)
  
    - [EvidenceCheck](#evidence_checker-EvidenceCheck)
  
- [Scalar Value Types](#scalar-value-types)



<a name="evidence-checker-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## evidence-checker.proto
proto 语法版本 proto3


<a name="evidence_checker-EvidenceCheckReq"></a>

### EvidenceCheckReq
定义请求体


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| submissions | [Submission](#evidence_checker-Submission) | repeated |  |






<a name="evidence_checker-EvidenceCheckResp"></a>

### EvidenceCheckResp
定义响应体


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| status | [EvidenceCheckResp.Status](#evidence_checker-EvidenceCheckResp-Status) |  |  |
| results | [SubmissionCheckResult](#evidence_checker-SubmissionCheckResult) | repeated | int32 first_failed_index = 2; |






<a name="evidence_checker-HealthCheckRequest"></a>

### HealthCheckRequest
The HealthCheckRequest message contains no content.






<a name="evidence_checker-HealthCheckResponse"></a>

### HealthCheckResponse
The HealthCheckResponse message includes status information about the service.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| service_name | [string](#string) |  |  |
| version | [string](#string) |  |  |
| status | [string](#string) |  |  |
| timestamp | [int64](#int64) |  |  |






<a name="evidence_checker-Submission"></a>

### Submission



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| image | [string](#string) |  |  |
| address | [string](#string) |  |  |
| network | [string](#string) |  |  |
| entity | [string](#string) |  |  |
| webpage | [string](#string) |  |  |






<a name="evidence_checker-SubmissionCheckResult"></a>

### SubmissionCheckResult



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| status | [SubmissionCheckResult.Status](#evidence_checker-SubmissionCheckResult-Status) |  |  |





 


<a name="evidence_checker-EvidenceCheckResp-Status"></a>

### EvidenceCheckResp.Status


| Name | Number | Description |
| ---- | ------ | ----------- |
| ALL_FAILED | 0 |  |
| SOME_FAILED | 1 |  |
| ALL_SUCCEED | 2 |  |



<a name="evidence_checker-SubmissionCheckResult-Status"></a>

### SubmissionCheckResult.Status


| Name | Number | Description |
| ---- | ------ | ----------- |
| IMAGE_REPEATED | 0 |  |
| CLAUDE3_NOT_AVAILABLE | 1 |  |
| CLAUDE3_RESPONSE_UNEXPECTED_DATA | 2 |  |
| IMAGE_ADDRESS_NOT_MATCH | 3 |  |
| IMAGE_NETWORK_NOT_MATCH | 4 |  |
| IMAGE_ENTITY_NOT_MATCH | 5 |  |
| WEBPAGE_ADDRESS_NOT_MATCH | 6 |  |
| WEBPAGE_NETWORK_NOT_MATCH | 7 |  |
| WEBPAGE_ENTITY_NOT_MATCH | 8 |  |
| IMAGE_EDITED | 9 |  |
| IMAGE_DATA_NOT_VALID | 10 |  |
| WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE | 11 |  |
| OK | 12 |  |


 

 


<a name="evidence_checker-EvidenceCheck"></a>

### EvidenceCheck
定义 EvidenceCheck 服务

| Method Name | Request Type | Response Type | Description |
| ----------- | ------------ | ------------- | ------------|
| checkEvidence | [EvidenceCheckReq](#evidence_checker-EvidenceCheckReq) | [EvidenceCheckResp](#evidence_checker-EvidenceCheckResp) | 主要业务接口, 支持批量提交submission进行校验 |
| health | [HealthCheckRequest](#evidence_checker-HealthCheckRequest) | [HealthCheckResponse](#evidence_checker-HealthCheckResponse) | 用于 k8s 健康检查 |
| checkImageRepeated | [EvidenceCheckReq](#evidence_checker-EvidenceCheckReq) | [EvidenceCheckResp](#evidence_checker-EvidenceCheckResp) | 单独的检测接口, 可以不使用 |
| checkImageInfo | [EvidenceCheckReq](#evidence_checker-EvidenceCheckReq) | [EvidenceCheckResp](#evidence_checker-EvidenceCheckResp) | 单独的图片校验接口, 可以不使用 |
| checkImageEdited | [EvidenceCheckReq](#evidence_checker-EvidenceCheckReq) | [EvidenceCheckResp](#evidence_checker-EvidenceCheckResp) | 单独的伪图片检测接口, 可以不使用 |
| checkWebpageInfo | [EvidenceCheckReq](#evidence_checker-EvidenceCheckReq) | [EvidenceCheckResp](#evidence_checker-EvidenceCheckResp) | 单独的webpage校验接口, 可以不使用 |

 



## Scalar Value Types

| .proto Type | Notes | C++ | Java | Python | Go | C# | PHP | Ruby |
| ----------- | ----- | --- | ---- | ------ | -- | -- | --- | ---- |
| <a name="double" /> double |  | double | double | float | float64 | double | float | Float |
| <a name="float" /> float |  | float | float | float | float32 | float | float | Float |
| <a name="int32" /> int32 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint32 instead. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="int64" /> int64 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint64 instead. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="uint32" /> uint32 | Uses variable-length encoding. | uint32 | int | int/long | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="uint64" /> uint64 | Uses variable-length encoding. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum or Fixnum (as required) |
| <a name="sint32" /> sint32 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int32s. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sint64" /> sint64 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int64s. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="fixed32" /> fixed32 | Always four bytes. More efficient than uint32 if values are often greater than 2^28. | uint32 | int | int | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="fixed64" /> fixed64 | Always eight bytes. More efficient than uint64 if values are often greater than 2^56. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum |
| <a name="sfixed32" /> sfixed32 | Always four bytes. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sfixed64" /> sfixed64 | Always eight bytes. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="bool" /> bool |  | bool | boolean | boolean | bool | bool | boolean | TrueClass/FalseClass |
| <a name="string" /> string | A string must always contain UTF-8 encoded or 7-bit ASCII text. | string | String | str/unicode | string | string | string | String (UTF-8) |
| <a name="bytes" /> bytes | May contain any arbitrary sequence of bytes. | string | ByteString | str | []byte | ByteString | string | String (ASCII-8BIT) |

