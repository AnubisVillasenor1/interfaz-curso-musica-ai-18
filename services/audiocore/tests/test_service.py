"""Pruebas HTTP del servicio TAMV-AudioCore.

Levantan un servidor real en un puerto efímero y hablan con él por `urllib`.
No requieren Docker ni la extensión nativa:

    cd services/audiocore
    python -m unittest discover -s tests -v
"""

from __future__ import annotations

import json
import threading
import unittest
import urllib.error
import urllib.request

from service import make_server


class ServiceHttpTests(unittest.TestCase):
    token = "test-token-no-real"

    @classmethod
    def setUpClass(cls) -> None:
        cls.server = make_server("127.0.0.1", 0, cls.token)
        cls.port = int(cls.server.server_address[1])
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def request(self, path: str, payload: dict | None = None, token: str | None = None):
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=data,
            method="GET" if payload is None else "POST",
            headers={"Content-Type": "application/json"},
        )
        if token is not None:
            request.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))

    def test_health_is_public_and_reports_limits(self) -> None:
        status, body = self.request("/health")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertTrue(body["authRequired"])
        self.assertEqual(body["limits"]["maxBins"], 16_384)

    def test_analyse_requires_the_bearer_token(self) -> None:
        status, body = self.request("/analyse", {"spectrumDb": [-90.0] * 64})
        self.assertEqual(status, 401)
        self.assertEqual(body["code"], "unauthorized")

    def test_analyse_accepts_a_valid_spectrum(self) -> None:
        spectrum = [-120.0] * 2_048
        spectrum[37] = 0.0
        status, body = self.request(
            "/analyse",
            {"spectrumDb": spectrum, "sampleRate": 48_000, "fftSize": 4_096},
            token=self.token,
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(body["chroma"]), 12)
        self.assertEqual(body["engine"], "numpy")
        self.assertEqual(body["sampleRate"], 48_000)

    def test_analyse_rejects_boolean_sample_rate(self) -> None:
        status, body = self.request(
            "/analyse",
            {"spectrumDb": [-90.0] * 64, "sampleRate": True},
            token=self.token,
        )
        self.assertEqual(status, 400)
        self.assertEqual(body["code"], "invalid_sample_rate")

    def test_analyse_rejects_non_power_of_two_fft(self) -> None:
        status, body = self.request(
            "/analyse",
            {"spectrumDb": [-90.0] * 64, "fftSize": 1_000},
            token=self.token,
        )
        self.assertEqual(status, 400)
        self.assertEqual(body["code"], "invalid_fft_size")

    def test_unknown_route_is_404(self) -> None:
        status, body = self.request("/nope")
        self.assertEqual(status, 404)
        self.assertEqual(body["code"], "not_found")


if __name__ == "__main__":
    unittest.main()
