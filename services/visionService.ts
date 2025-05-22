import axios from "axios";

const VISION_API_KEY = "AIzaSyD3wpw7y6jJqL905btvKlscgYku5fZxj_I";

export const detectText = async (base64Image: string) => {
  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }
    );
    return response.data.responses[0] || "";
  } catch (error) {
    console.error("Vision API Error:", error);
    throw error;
  }
};
