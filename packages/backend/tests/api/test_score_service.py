from app.services.score_service import calculate_lead_score


def test_score_lead_completo_deve_ser_100():
    lead = {
        "phone": "11987654321",
        "email": "contato@empresa.com",
        "address": "Av Paulista, 1000, Bela Vista",
        "cnpj": "12.345.678/0001-90",
        "name": "Transporte Escolar Premium",
        "url": "https://maps.google.com/example",
        "city": "São Paulo",
        "state": "SP",
        "source": "google_maps",
    }
    result = calculate_lead_score(lead)
    assert result["total"] == 100


def test_score_so_com_telefone_deve_ser_25():
    lead = {"phone": "11987654321"}
    result = calculate_lead_score(lead)
    assert result["total"] == 25
    assert result["breakdown"]["phone"] is True


def test_score_lead_vazio_deve_ser_0():
    result = calculate_lead_score({})
    assert result["total"] == 0


def test_score_sem_email_mas_com_demais_campos_deve_ser_85():
    lead = {
        "phone": "11987654321",
        "address": "Rua Augusta, 500, Consolação",
        "cnpj": "12345678000190",
        "name": "Escola Van XPTO",
        "url": "https://maps.google.com/example",
        "city": "São Paulo",
        "state": "SP",
        "source": "google_maps",
    }
    result = calculate_lead_score(lead)
    assert result["total"] == 85
    assert result["breakdown"]["email"] is False


def test_cnpj_invalido_nao_deve_pontuar():
    lead = {
        "phone": "11987654321",
        "cnpj": "12345",
    }
    result = calculate_lead_score(lead)
    assert result["breakdown"]["cnpj"] is False
    assert result["total"] == 25


def test_telefone_invalido_com_10_digitos_nao_deve_pontuar():
    lead = {"phone": "1198765432"}
    result = calculate_lead_score(lead)
    assert result["breakdown"]["phone"] is False
    assert result["total"] == 0


def test_email_invalido_nao_deve_pontuar():
    lead = {
        "phone": "11987654321",
        "email": "email-invalido",
    }
    result = calculate_lead_score(lead)
    assert result["breakdown"]["email"] is False
    assert result["total"] == 25


def test_endereco_curto_nao_deve_pontuar():
    lead = {
        "phone": "11987654321",
        "address": "Rua A, 1",
    }
    result = calculate_lead_score(lead)
    assert result["breakdown"]["address"] is False
    assert result["total"] == 25


def test_source_cnpj_lookup_deve_pontuar():
    lead = {
        "phone": "11987654321",
        "source": "cnpj_lookup",
    }
    result = calculate_lead_score(lead)
    assert result["breakdown"]["source"] is True
    assert result["total"] == 30


def test_name_curto_nao_deve_pontuar():
    lead = {
        "phone": "11987654321",
        "name": "Ana",
    }
    result = calculate_lead_score(lead)
    assert result["breakdown"]["name"] is False
    assert result["total"] == 25
