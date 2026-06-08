package claude3

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"testing"
	"time"
)

func TestClaude3Api(t *testing.T) {
	content, err := os.ReadFile("/Users/nolan/Documents/evidence/27.png")
	if err != nil {
		println(err.Error())
	}
	base64Str := base64.StdEncoding.EncodeToString([]byte(content))
	contentstr := "data:image/png;base64," + string(base64Str)
	println(contentstr[0:10])

	CallClaude3(contentstr, "")

}

func TestUnmarshal(t *testing.T) {
	//textstr := `  {"usage": {
	//       "input_tokens": 1728,
	//       "output_tokens": 117
	//   },
	//   "content": [
	//       {
	//           "type": "text",
	//           "text": "{\n  \"sendAddrs\": [\n    \"0xe22434cca7f03cb4d3d26029e1df1648738f3ca1\"\n  ],\n  \"sendEntity\": \"Exchange: Bithumb\",\n  \"recvAddrs\": [\n    \"0xef1d3ed13a11126d638e15512419abb1fa1f829\"\n  ],\n  \"recvEntity\": \"\",\n  \"network\": \"polygon\"\n}"
	//       }
	//   ]}`
	textstr := `  
            {
            "type": "text",
            "text": "{\n  \"sendAddrs\": [\n    \"0xe22434cca7f03cb4d3d26029e1df1648738f3ca1\"\n  ],\n  \"sendEntity\": \"Exchange: Bithumb\",\n  \"recvAddrs\": [\n    \"0xef1d3ed13a11126d638e15512419abb1fa1f829\"\n  ],\n  \"recvEntity\": \"\",\n  \"network\": \"polygon\"\n}"
        }
    `
	var x = &RespContent{}
	err := json.Unmarshal([]byte(textstr), x)
	if err != nil {
		println(err.Error())
	}
	println(x.Text)

}

func TestUnmarshalOcr(t *testing.T) {
	//textstr := `  {"usage": {
	//       "input_tokens": 1728,
	//       "output_tokens": 117
	//   },
	//   "content": [
	//       {
	//           "type": "text",
	//           "text": "{\n  \"sendAddrs\": [\n    \"0xe22434cca7f03cb4d3d26029e1df1648738f3ca1\"\n  ],\n  \"sendEntity\": \"Exchange: Bithumb\",\n  \"recvAddrs\": [\n    \"0xef1d3ed13a11126d638e15512419abb1fa1f829\"\n  ],\n  \"recvEntity\": \"\",\n  \"network\": \"polygon\"\n}"
	//       }
	//   ]}`
	textstr := `  
            {\n  \"sendAddrs\": [\n    \"0xe22434cca7f03cb4d3d26029e1df1648738f3ca1\"\n  ],\n  \"sendEntity\": \"Exchange: Bithumb\",\n  \"recvAddrs\": [\n    \"0xef1d3ed13a11126d638e15512419abb1fa1f829\"\n  ],\n  \"recvEntity\": \"\",\n  \"network\": \"polygon\"\n}"
    `
	var x = &RespContent{}
	err := json.Unmarshal([]byte(textstr), x)
	if err != nil {
		println(err.Error())
	}
	println(x.Text)

}
func TestAddrValidate(t *testing.T) {
	println(isBlockAddr("0xcd53c9fa6b1b6bb0ba93e555477168c52bfc5747"))
	println(isBlockAddr("0xcd53c9f....c5747"))
	println(isBlockAddr("0x4213d42a5a6bd38ef9a166b179d1f360ff536d39"))
	println(isBlockAddr("0x8cd4f15f9973fb7c36c60790b4898095bd53a6568700aa22ef0a81fc13a548f0"))
	///	)

}

func TestForrange(t *testing.T) {
	var arr = make([]int, 100)
	for i := 0; i != 100; i++ {
		arr[i] = i
	}
	for i, v := range arr {
		go func() {
			println(i, v)
		}()
	}
	time.Sleep(5 * time.Second)
}

func TestBedrockImage(t *testing.T) {
	Init();
	content, err := os.ReadFile("/Users/nolan/Documents/evidence/27.png")
	if err != nil {
		println(err.Error())
	}
	base64Str := base64.StdEncoding.EncodeToString([]byte(content))
	contentstr := "data:image/png;base64," + string(base64Str)

	println(time.Now().Unix())
	//CallBedrock(contentstr)
	println(time.Now().Unix())
	//CallBedrockImageWithTranslate(contentstr,"wo shizhongguoren ")
	println(time.Now().Unix())



}
