/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/balzort.json`.
 */
export type Balzort = {
  "address": "7F8bQvi3ppn4i7APswRX23hUFuq41dtkguy8aWLLtic8",
  "metadata": {
    "name": "balzort",
    "version": "0.2.4",
    "spec": "0.1.0",
    "description": "Balzort — Anchor Auth + VRF + Tournament Program"
  },
  "instructions": [
    {
      "name": "abandonPuzzle",
      "discriminator": [
        60,
        221,
        92,
        169,
        114,
        215,
        1,
        141
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "applyMove",
      "discriminator": [
        196,
        116,
        174,
        213,
        239,
        192,
        203,
        47
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  98,
                  111,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "puzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "fromTube",
          "type": "u8"
        },
        {
          "name": "toTube",
          "type": "u8"
        }
      ]
    },
    {
      "name": "applyUndo",
      "discriminator": [
        67,
        111,
        241,
        156,
        9,
        0,
        239,
        220
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  98,
                  111,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "puzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "claimPrize",
      "discriminator": [
        157,
        233,
        139,
        121,
        246,
        62,
        234,
        235
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "playerAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "tournament",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tournament.tournament_id",
                "account": "tournament"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tournamentVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tournament.tournament_id",
                "account": "tournament"
              }
            ]
          }
        },
        {
          "name": "tournamentEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116,
                  95,
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "tournament"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "playerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "closeSession",
      "discriminator": [
        68,
        114,
        178,
        140,
        222,
        38,
        248,
        211
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeTournament",
      "discriminator": [
        14,
        80,
        54,
        9,
        221,
        239,
        201,
        35
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tournament",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tournament.tournament_id",
                "account": "tournament"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tournamentVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tournament.tournament_id",
                "account": "tournament"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "consumeRandomness",
      "discriminator": [
        190,
        217,
        49,
        162,
        99,
        26,
        73,
        234
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "signer": true,
          "address": "9irBy75QS2BN81FUgXuHcjqceJJRuc9oDkAe8TKVvvAw"
        },
        {
          "name": "player",
          "writable": true
        },
        {
          "name": "puzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "createPlayer",
      "discriminator": [
        19,
        178,
        189,
        216,
        159,
        134,
        0,
        192
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createPuzzlePermissions",
      "discriminator": [
        35,
        188,
        175,
        155,
        161,
        55,
        220,
        145
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true
        },
        {
          "name": "puzzleStats",
          "writable": true
        },
        {
          "name": "puzzleBoardPermission",
          "writable": true
        },
        {
          "name": "puzzleStatsPermission",
          "writable": true
        },
        {
          "name": "permissionProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createTournament",
      "discriminator": [
        158,
        137,
        233,
        231,
        73,
        132,
        191,
        68
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tournament",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game.tournament_count",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "tournamentVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game.tournament_count",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createTournamentParams"
            }
          }
        }
      ]
    },
    {
      "name": "delegatePuzzle",
      "discriminator": [
        236,
        63,
        240,
        113,
        3,
        153,
        123,
        218
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "bufferPuzzleBoard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "puzzleBoard"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                92,
                196,
                214,
                179,
                164,
                117,
                44,
                211,
                161,
                210,
                188,
                123,
                227,
                71,
                240,
                43,
                236,
                187,
                154,
                244,
                132,
                247,
                13,
                137,
                112,
                149,
                83,
                203,
                164,
                244,
                42,
                129
              ]
            }
          }
        },
        {
          "name": "delegationRecordPuzzleBoard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "puzzleBoard"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPuzzleBoard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "puzzleBoard"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true
        },
        {
          "name": "bufferPuzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "puzzleStats"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                92,
                196,
                214,
                179,
                164,
                117,
                44,
                211,
                161,
                210,
                188,
                123,
                227,
                71,
                240,
                43,
                236,
                187,
                154,
                244,
                132,
                247,
                13,
                137,
                112,
                149,
                83,
                203,
                164,
                244,
                42,
                129
              ]
            }
          }
        },
        {
          "name": "delegationRecordPuzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "puzzleStats"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPuzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "puzzleStats"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "puzzleStats",
          "writable": true
        },
        {
          "name": "validator"
        },
        {
          "name": "ownerProgram",
          "address": "7F8bQvi3ppn4i7APswRX23hUFuq41dtkguy8aWLLtic8"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "delegatePuzzlePermissions",
      "discriminator": [
        96,
        192,
        209,
        47,
        173,
        239,
        126,
        35
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true
        },
        {
          "name": "puzzleStats",
          "writable": true
        },
        {
          "name": "puzzleBoardPermission",
          "writable": true
        },
        {
          "name": "puzzleStatsPermission",
          "writable": true
        },
        {
          "name": "permissionProgram"
        },
        {
          "name": "delegationProgram"
        },
        {
          "name": "boardDelegationBuffer",
          "writable": true
        },
        {
          "name": "boardDelegationRecord",
          "writable": true
        },
        {
          "name": "boardDelegationMetadata",
          "writable": true
        },
        {
          "name": "statsDelegationBuffer",
          "writable": true
        },
        {
          "name": "statsDelegationRecord",
          "writable": true
        },
        {
          "name": "statsDelegationMetadata",
          "writable": true
        },
        {
          "name": "validator"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "finalizePuzzle",
      "discriminator": [
        122,
        117,
        70,
        166,
        16,
        241,
        40,
        27
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "initPuzzle",
      "discriminator": [
        115,
        166,
        68,
        22,
        105,
        35,
        115,
        146
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  98,
                  111,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "puzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "oracleQueue",
          "writable": true,
          "address": "Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "numTubes",
          "type": "u8"
        },
        {
          "name": "ballsPerTube",
          "type": "u8"
        },
        {
          "name": "difficulty",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializeGame",
      "discriminator": [
        44,
        62,
        102,
        247,
        126,
        208,
        130,
        215
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initGameParams"
            }
          }
        }
      ]
    },
    {
      "name": "joinTournament",
      "discriminator": [
        77,
        21,
        212,
        206,
        77,
        82,
        124,
        31
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "tournament",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tournament.tournament_id",
                "account": "tournament"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tournamentVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tournament.tournament_id",
                "account": "tournament"
              }
            ]
          }
        },
        {
          "name": "playerTokenAccount",
          "writable": true
        },
        {
          "name": "tournamentEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116,
                  95,
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "tournament"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "openSession",
      "discriminator": [
        130,
        54,
        124,
        7,
        236,
        20,
        104,
        104
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "sessionKey",
          "type": "pubkey"
        },
        {
          "name": "expiresInSecs",
          "type": "u32"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "recordTournamentResult",
      "discriminator": [
        70,
        158,
        217,
        88,
        63,
        68,
        232,
        254
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "tournament",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tournament.tournament_id",
                "account": "tournament"
              }
            ]
          }
        },
        {
          "name": "tournamentEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  117,
                  114,
                  110,
                  97,
                  109,
                  101,
                  110,
                  116,
                  95,
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "tournament"
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "puzzleStats",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "tournament_entry.puzzle_nonce",
                "account": "tournamentEntry"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "startPuzzle",
      "discriminator": [
        185,
        248,
        132,
        48,
        101,
        15,
        200,
        249
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  98,
                  111,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "puzzleStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  122,
                  122,
                  108,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "player.puzzles_started_nonce.saturating_sub(1)",
                "account": "player"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "undelegatePuzzle",
      "discriminator": [
        14,
        237,
        88,
        59,
        241,
        22,
        86,
        91
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.wallet",
                "account": "player"
              }
            ]
          }
        },
        {
          "name": "game",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "puzzleBoard",
          "writable": true
        },
        {
          "name": "puzzleStats",
          "writable": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateGame",
      "discriminator": [
        159,
        61,
        132,
        131,
        3,
        234,
        209,
        220
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateGameParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "game",
      "discriminator": [
        27,
        90,
        166,
        125,
        74,
        100,
        121,
        18
      ]
    },
    {
      "name": "player",
      "discriminator": [
        205,
        222,
        112,
        7,
        165,
        155,
        206,
        218
      ]
    },
    {
      "name": "puzzleBoard",
      "discriminator": [
        144,
        63,
        236,
        193,
        56,
        100,
        65,
        78
      ]
    },
    {
      "name": "puzzleStats",
      "discriminator": [
        181,
        69,
        145,
        108,
        245,
        86,
        87,
        30
      ]
    },
    {
      "name": "tournament",
      "discriminator": [
        175,
        139,
        119,
        242,
        115,
        194,
        57,
        92
      ]
    },
    {
      "name": "tournamentEntry",
      "discriminator": [
        36,
        203,
        172,
        114,
        100,
        189,
        217,
        158
      ]
    }
  ],
  "events": [
    {
      "name": "gameInitialized",
      "discriminator": [
        82,
        221,
        11,
        2,
        244,
        52,
        240,
        250
      ]
    },
    {
      "name": "gameUpdated",
      "discriminator": [
        100,
        97,
        130,
        101,
        84,
        101,
        4,
        15
      ]
    },
    {
      "name": "prizeClaimed",
      "discriminator": [
        213,
        150,
        192,
        76,
        199,
        33,
        212,
        38
      ]
    },
    {
      "name": "puzzleAbandoned",
      "discriminator": [
        159,
        247,
        165,
        73,
        83,
        73,
        180,
        5
      ]
    },
    {
      "name": "puzzleFinalized",
      "discriminator": [
        42,
        78,
        162,
        96,
        84,
        205,
        52,
        215
      ]
    },
    {
      "name": "puzzleInitialized",
      "discriminator": [
        91,
        30,
        17,
        68,
        2,
        172,
        248,
        54
      ]
    },
    {
      "name": "puzzleStarted",
      "discriminator": [
        246,
        46,
        41,
        143,
        69,
        197,
        233,
        48
      ]
    },
    {
      "name": "tournamentClosed",
      "discriminator": [
        246,
        137,
        155,
        89,
        226,
        38,
        87,
        8
      ]
    },
    {
      "name": "tournamentCreated",
      "discriminator": [
        102,
        32,
        240,
        45,
        52,
        64,
        97,
        0
      ]
    },
    {
      "name": "tournamentJoined",
      "discriminator": [
        218,
        233,
        210,
        2,
        29,
        16,
        131,
        7
      ]
    },
    {
      "name": "tournamentResultRecorded",
      "discriminator": [
        0,
        18,
        228,
        184,
        203,
        136,
        19,
        146
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized signer — not the player wallet or a valid session key"
    },
    {
      "code": 6001,
      "name": "notAuthority",
      "msg": "Only the authority can call this"
    },
    {
      "code": 6002,
      "name": "notTournamentAuthority",
      "msg": "Only the tournament authority can call this"
    },
    {
      "code": 6003,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6004,
      "name": "invalidState",
      "msg": "Invalid state for this operation"
    },
    {
      "code": 6005,
      "name": "invalidInput",
      "msg": "Invalid input parameter"
    }
  ],
  "types": [
    {
      "name": "createTournamentParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entryFee",
            "type": "u64"
          },
          {
            "name": "difficulty",
            "type": "u8"
          },
          {
            "name": "durationSecs",
            "type": "i64"
          },
          {
            "name": "maxTimeSecs",
            "type": "u64"
          },
          {
            "name": "numTubes",
            "type": "u8"
          },
          {
            "name": "ballsPerTube",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "treasuryFeeBps",
            "type": "u16"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "tournamentCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "gameInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "gameUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "field",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "initGameParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "treasuryFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "sessionKey",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "sessionExpiresAt",
            "type": "i64"
          },
          {
            "name": "totalPuzzlesSolved",
            "type": "u64"
          },
          {
            "name": "puzzlesStartedNonce",
            "type": "u64"
          },
          {
            "name": "vrfRandomness",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "prizeClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tournament",
            "type": "pubkey"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "puzzleAbandoned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "puzzleBoard",
            "type": "pubkey"
          },
          {
            "name": "puzzleStats",
            "type": "pubkey"
          },
          {
            "name": "moveCount",
            "type": "u32"
          },
          {
            "name": "undoCount",
            "type": "u32"
          },
          {
            "name": "difficulty",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "puzzleBoard",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "numTubes",
            "type": "u8"
          },
          {
            "name": "numColors",
            "type": "u8"
          },
          {
            "name": "maxCapacity",
            "type": "u8"
          },
          {
            "name": "balls",
            "type": {
              "array": [
                "u8",
                120
              ]
            }
          },
          {
            "name": "tubeLengths",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          },
          {
            "name": "vrfSeed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "undoFrom",
            "type": "u8"
          },
          {
            "name": "undoTo",
            "type": "u8"
          },
          {
            "name": "undoBall",
            "type": "u8"
          },
          {
            "name": "hasUndo",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "puzzleFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "puzzleBoard",
            "type": "pubkey"
          },
          {
            "name": "puzzleStats",
            "type": "pubkey"
          },
          {
            "name": "moveCount",
            "type": "u32"
          },
          {
            "name": "undoCount",
            "type": "u32"
          },
          {
            "name": "difficulty",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "puzzleInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "puzzleBoard",
            "type": "pubkey"
          },
          {
            "name": "puzzleStats",
            "type": "pubkey"
          },
          {
            "name": "numTubes",
            "type": "u8"
          },
          {
            "name": "ballsPerTube",
            "type": "u8"
          },
          {
            "name": "difficulty",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "puzzleStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "puzzleBoard",
            "type": "pubkey"
          },
          {
            "name": "player",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "puzzleStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "difficulty",
            "type": "u8"
          },
          {
            "name": "numTubes",
            "type": "u8"
          },
          {
            "name": "ballsPerTube",
            "type": "u8"
          },
          {
            "name": "moveCount",
            "type": "u32"
          },
          {
            "name": "undoCount",
            "type": "u32"
          },
          {
            "name": "startedAt",
            "type": "i64"
          },
          {
            "name": "completedAt",
            "type": "i64"
          },
          {
            "name": "isSolved",
            "type": "bool"
          },
          {
            "name": "finalScore",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tournament",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "entryFee",
            "type": "u64"
          },
          {
            "name": "prizePool",
            "type": "u64"
          },
          {
            "name": "netPrizePool",
            "type": "u64"
          },
          {
            "name": "treasuryFeeBps",
            "type": "u16"
          },
          {
            "name": "difficulty",
            "type": "u8"
          },
          {
            "name": "numTubes",
            "type": "u8"
          },
          {
            "name": "ballsPerTube",
            "type": "u8"
          },
          {
            "name": "maxTimeSecs",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "totalEntries",
            "type": "u32"
          },
          {
            "name": "totalCompleters",
            "type": "u32"
          },
          {
            "name": "cumulativeWeight",
            "type": "u128"
          },
          {
            "name": "isClosed",
            "type": "bool"
          },
          {
            "name": "tournamentId",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tournamentClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tournament",
            "type": "pubkey"
          },
          {
            "name": "totalEntries",
            "type": "u32"
          },
          {
            "name": "totalCompleters",
            "type": "u32"
          },
          {
            "name": "prizePool",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tournamentCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tournament",
            "type": "pubkey"
          },
          {
            "name": "entryFee",
            "type": "u64"
          },
          {
            "name": "difficulty",
            "type": "u8"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "treasuryFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "tournamentEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tournament",
            "type": "pubkey"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "entryDeposit",
            "type": "u64"
          },
          {
            "name": "puzzleNonce",
            "type": "u64"
          },
          {
            "name": "parimutuelWeight",
            "type": "u128"
          },
          {
            "name": "completed",
            "type": "bool"
          },
          {
            "name": "hasClaimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tournamentJoined",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tournament",
            "type": "pubkey"
          },
          {
            "name": "player",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tournamentResultRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tournament",
            "type": "pubkey"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "weight",
            "type": "u128"
          },
          {
            "name": "elapsedSecs",
            "type": "u64"
          },
          {
            "name": "moveCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "updateGameParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "treasuryFeeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "isPaused",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    }
  ]
};
